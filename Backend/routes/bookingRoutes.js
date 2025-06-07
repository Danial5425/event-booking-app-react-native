import express from 'express';
import { Event } from '../Models/EventModel.js';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { User } from '../Models/UserModel.js';
import axios from 'axios';

const router = express.Router();

// Get user's paid bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all events that have bookings for this user
    const events = await Event.find({
      'bookings.user': new mongoose.Types.ObjectId(userId)
    })
    .populate({
      path: 'organizer',
      model: 'User',
      select: 'name email mobile profileImage bio address'
    })
    .lean();

    // Extract and format the bookings
    const bookings = events.flatMap(event => {
      return event.bookings
        .filter(booking => 
          booking.user.toString() === userId && 
          booking.paymentStatus === 'paid'
        )
        .map(booking => ({
          ...booking,
          event: {
            _id: event._id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            imageUrl: event.imageUrl,
            organizer: event.organizer
          }
        }));
    });

    // Log the bookings data for debugging
    // console.log('Bookings Data:', JSON.stringify(bookings[0]?.event?.organizer, null, 2));

    res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// Cancel a booking
router.post('/cancel/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    // Find the event containing the booking
    const event = await Event.findOne({
      'bookings._id': new mongoose.Types.ObjectId(bookingId),
      'bookings.user': new mongoose.Types.ObjectId(userId)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the specific booking
    const booking = event.bookings.find(
      b => b._id.toString() === bookingId && 
           b.user.toString() === userId
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is already cancelled
    if (booking.paymentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Check if the event date has passed
    const eventDate = new Date(event.date);
    const currentDate = new Date();
    if (eventDate < currentDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking for past events'
      });
    }

    // Update the booking status to cancelled
    booking.paymentStatus = 'cancelled';
    booking.cancelledAt = new Date();

    // Save the event with updated booking
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        status: 'cancelled',
        cancelledAt: booking.cancelledAt
      }
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

// Download ticket as PDF
// In your bookings route file
router.get('/ticket/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    // Find the event containing the booking
    const event = await Event.findOne({
      'bookings._id': new mongoose.Types.ObjectId(bookingId),
      'bookings.user': new mongoose.Types.ObjectId(userId)
    }).populate({
      path: 'organizer',
      model: 'User',
      select: 'name email mobile profileImage bio address'
    }).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the specific booking
    const booking = event.bookings.find(
      b => b._id.toString() === bookingId && 
           b.user.toString() === userId
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create PDF with improved layout
    const doc = new PDFDocument({
      size: 'A6',
      margin: 20,
      info: {
        Title: `Ticket for ${event.title}`,
        Author: event.organizer.name,
        Creator: 'Event Management System'
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${event.title.replace(/[^a-z0-9]/gi, '_')}_${booking.ticketNumber}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add header with title and ticket number
    doc.fontSize(12)
       .fillColor('#666')
       .text('EVENT TICKET', 20, 25, { width: 200, align: 'left' });
    
    doc.fontSize(10)
       .text(`Ticket #: ${booking.ticketNumber}`, 20, 40, { width: 200, align: 'left' });
    
    doc.fontSize(8)
       .text(new Date().toLocaleString(), 20, 55, { width: 200, align: 'left' });

    // Add decorative divider
    doc.moveTo(20, 80)
       .lineTo(400, 80)
       .stroke('#020b73')
       .lineWidth(1);

    // Add event title
    doc.fontSize(16)
       .fillColor('#020b73')
       .text(event.title, 20, 120, { width: 400, align: 'center' });

    // Add event details in two columns
    const leftCol = 20;
    const rightCol = 200;
    let y = 150;

    doc.fontSize(10)
       .fillColor('#333')
       .text('Date:', leftCol, y)
       .text(new Date(event.date).toLocaleDateString(), leftCol + 40, y);
    
    doc.text('Time:', rightCol, y)
       .text(event.time, rightCol + 40, y);
    
    y += 20;

    doc.text('Location:', leftCol, y)
       .text(event.location.address.substring(0, 30) + (event.location.address.length > 30 ? '...' : ''), leftCol + 60, y);
    
    y += 20;

    // Add organizer contact information
    doc.font('Helvetica-Bold')
       .text('Organizer:', leftCol, y)
       .text(event.organizer.name, leftCol + 60, y);
    
    y += 15;

    doc.font('Helvetica-Bold')
       .text('Contact:', leftCol, y)
       .text(event.organizer.mobile || 'N/A', leftCol + 60, y);
    
    y += 15;

    // Add seat information
    doc.font('Helvetica-Bold')
       .text('Seats:', leftCol, y);
    
    booking.seats.forEach((seat, i) => {
      doc.font('Helvetica')
         .text(`${seat.seatNumber} (${seat.type})`, leftCol + 40, y + (i * 15));
    });

    // Add footer with barcode
    doc.moveTo(20, 280)
       .lineTo(400, 280)
       .stroke('#020b73')
       .lineWidth(1);
    
    doc.fontSize(8)
       .fillColor('#666')
       .text('Present this ticket at the venue for entry', 20, 290, { width: 400, align: 'center' });
    
    // Add ticket number at the bottom instead of barcode
    doc.fontSize(10)
       .fillColor('#333')
       .text(booking.ticketNumber, 20, 310, { width: 400, align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating ticket PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ticket PDF',
      error: error.message
    });
  }
});

// Email ticket
router.post('/email-ticket/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    // Find user's email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the event containing the booking
    const event = await Event.findOne({
      'bookings._id': new mongoose.Types.ObjectId(bookingId),
      'bookings.user': new mongoose.Types.ObjectId(userId)
    }).populate({
      path: 'organizer',
      select: 'name email mobile profileImage bio address'
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the specific booking
    const booking = event.bookings.find(
      b => b._id.toString() === bookingId && 
           b.user.toString() === userId
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Generate ticket number with prefix and padding
    const formattedTicketNumber = `TKT-${booking.ticketNumber.toString().padStart(6, '0')}`;

    // Create PDF with professional design
    const doc = new PDFDocument({
      size: 'A6',
      margin: 20,
      info: {
        Title: `Ticket for ${event.title}`,
        Author: event.organizer.name,
        Creator: 'Event Management System'
      }
    });

    // Store PDF in memory
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Create a promise to handle PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });

    // Add professional header with logo
    doc.fillColor('#020b73')
       .fontSize(18)
       .text('EVENT TICKET', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Add decorative border
    doc.strokeColor('#020b73')
       .lineWidth(2)
       .roundedRect(20, doc.y, doc.page.width - 40, 3, 2)
       .stroke();
    
    doc.moveDown(1);

    // Event title with styling
    doc.fontSize(16)
       .fillColor('#333')
       .font('Helvetica-Bold')
       .text(event.title.toUpperCase(), { align: 'center' });
    
    doc.moveDown(1);

    // Event details in two-column layout
    const leftCol = 30;
    const rightCol = 200;
    let y = doc.y;

    // Event date and time
    doc.fontSize(10)
       .fillColor('#666')
       .font('Helvetica-Bold')
       .text('DATE:', leftCol, y)
       .font('Helvetica')
       .text(new Date(event.date).toLocaleDateString('en-US', { 
         weekday: 'short', 
         year: 'numeric', 
         month: 'short', 
         day: 'numeric' 
       }), leftCol + 30, y);
    
    doc.font('Helvetica-Bold')
       .text('TIME:', rightCol, y)
       .font('Helvetica')
       .text(event.time, rightCol + 30, y);
    
    y += 15;

    // Location information
    doc.font('Helvetica-Bold')
       .text('LOCATION:  ', leftCol, y)
       .font('Helvetica')
       .text(event.location.address, leftCol + 50, y, {
         width: 250,
         lineBreak: false
       });
    
    y += 15;

    // Ticket number and barcode placeholder
    doc.font('Helvetica-Bold')
       .text('TICKET #:', leftCol, y)
       .font('Helvetica')
       .text(formattedTicketNumber, leftCol + 50, y);
    
    y += 15;

    // Seat information
    doc.font('Helvetica-Bold')
       .text('SEATS:', leftCol, y);
    
    booking.seats.forEach((seat, i) => {
      doc.font('Helvetica')
         .text(`${seat.seatNumber} (${seat.type})`, leftCol + 40, y + (i * 15));
    });

    // Add QR code for ticket validation
    const qrData = JSON.stringify({
      eventId: event._id,
      bookingId: booking._id,
      ticketNumber: booking.ticketNumber,
      userId: userId
    });
    
    // Remove QR code generation and replace with ticket number
    doc.fontSize(12)
       .fillColor('#333')
      //  .text('Ticket Number:', doc.page.width - 120, 100)
      //  .text(formattedTicketNumber, doc.page.width - 120, 115);

    // Add footer with terms and conditions
    doc.moveTo(20, doc.page.height - 50)
       .lineTo(doc.page.width - 20, doc.page.height - 50)
       .stroke('#020b73')
       .lineWidth(1);
    
    doc.fontSize(8)
       .fillColor('#666')
       .text('Terms & Conditions: This ticket is non-transferable. Please present this ticket at the venue for entry.', 
         20, doc.page.height - 40, {
           width: doc.page.width - 40,
           align: 'center'
         });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await pdfPromise;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Email content
    const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Your Ticket for ${event.title}</title>
          <style>
              body {
                  font-family: 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .header {
                  text-align: center;
                  padding: 20px 0;
                  border-bottom: 1px solid #eee;
              }
              .ticket-details {
                  background-color: #f9f9f9;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
              }
              .section {
                  margin-bottom: 20px;
              }
              .section-title {
                  color: #020b73;
                  font-size: 18px;
                  margin-bottom: 10px;
                  font-weight: bold;
              }
              .detail-row {
                  display: flex;
                  margin-bottom: 8px;
              }
              .detail-label {
                  font-weight: bold;
                  width: 120px;
              }
              .footer {
                  text-align: center;
                  font-size: 12px;
                  color: #777;
                  margin-top: 20px;
                  border-top: 1px solid #eee;
                  padding-top: 20px;
              }
          </style>
      </head>
      <body>
          <div class="header">
              <h1 style="color: #020b73; margin-bottom: 5px;">Your Event Ticket</h1>
              <p style="color: #666;">${event.title}</p>
          </div>
          
          <div class="ticket-details">
              <div class="section">
                  <div class="section-title">Event Information</div>
                  <div class="detail-row">
                      <div class="detail-label">Date:</div>
                      <div>${new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</div>
                  </div>
                  <div class="detail-row">
                      <div class="detail-label">Time:</div>
                      <div>${event.time}</div>
                  </div>
                  <div class="detail-row">
                      <div class="detail-label">Location:</div>
                      <div>${event.location.address}</div>
                  </div>
              </div>
              
              <div class="section">
                  <div class="section-title">Ticket Information</div>
                  <div class="detail-row">
                      <div class="detail-label">Ticket Number:</div>
                      <div>${formattedTicketNumber}</div>
                  </div>
                  <div class="detail-row">
                      <div class="detail-label">Seats:</div>
                      <div>${booking.seats.map(seat => `${seat.seatNumber} (${seat.type})`).join(', ')}</div>
                  </div>
                  <div class="detail-row">
                      <div class="detail-label">Amount Paid:</div>
                      <div>₹${booking.totalAmount}</div>
                  </div>
              </div>
          </div>
          
          <div class="section">
              <div class="section-title">Organizer Contact</div>
              <div class="detail-row">
                  <div class="detail-label">Name:</div>
                  <div>${event.organizer.name}</div>
              </div>
              <div class="detail-row">
                  <div class="detail-label">Email:</div>
                  <div>${event.organizer.email}</div>
              </div>
              <div class="detail-row">
                  <div class="detail-label">Phone:</div>
                  <div>${event.organizer.mobile || 'N/A'}</div>
              </div>
          </div>
          
          <div class="footer">
              <p>Please present this ticket (either printed or on your mobile device) at the venue entrance.</p>
              <p>If you have any questions, please contact the event organizer.</p>
              <p>© ${new Date().getFullYear()} ${event.organizer.name}. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: `Your Ticket for ${event.title}`,
      html: emailTemplate,
      attachments: [{
        filename: `ticket-${booking.ticketNumber}.pdf`,
        content: pdfBuffer
      }]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Log the email sending
    // console.log(`Ticket email sent to ${user.email} for booking ${bookingId}`);

    res.status(200).json({
      success: true,
      message: 'Your ticket has been sent to your email address',
      data: {
        ticketNumber: formattedTicketNumber,
        sentTo: user.email,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending ticket email:', error);
    
    // More detailed error response
    const errorResponse = {
      success: false,
      message: 'Failed to send ticket email',
      error: error.message
    };

    if (error.response) {
      errorResponse.serviceError = {
        code: error.response.code,
        status: error.response.status,
        data: error.response.data
      };
    }

    res.status(500).json(errorResponse);
  }
});

export default router;