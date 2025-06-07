import express from "express";
import { Event } from "../Models/EventModel.js";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize Stripe with error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
  console.log('Stripe initialized successfully');
} catch (error) {
  console.error('Stripe initialization error:', error.message);
  throw error;
}

// Initialize payment
router.post('/:eventId/payment', authenticateToken, async (req, res) => {
  let event;
  let bookingId;
  
  try {
    const { eventId } = req.params;
    const { seats, totalAmount } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!seats || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid payment request" });
    }

    event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check seat availability
    const unavailableSeats = seats.filter(seat => 
      event.bookedSeats.some(bs => bs.seatId === seat.seatId && 
        (!bs.expiresAt || bs.expiresAt > new Date()))
    );

    if (unavailableSeats.length > 0) {
      return res.status(400).json({
        message: "Some seats are no longer available",
        unavailableSeats: unavailableSeats.map(s => s.seatId)
      });
    }

    // Create booking
    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const booking = {
      user: userId,
      seats,
      totalAmount,
      paymentStatus: 'pending',
      ticketNumber
    };

    event.bookings.push(booking);
    bookingId = event.bookings[event.bookings.length - 1]._id;

    // Reserve seats temporarily (15 minutes)
    seats.forEach(seat => {
      event.bookedSeats.push({
        seatId: seat.seatId,
        booking: bookingId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
    });

    await event.save();

    // Create Stripe payment intent (only card payments)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'inr',
      payment_method_types: ['card'],
      description: `Payment for event: ${event.title}`,
      metadata: {
        eventId,
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        ticketNumber
      }
    });

    res.status(200).json({
      message: "Payment initiated",
      bookingId,
      ticketNumber,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Payment error:', error);
    
    // Rollback seat reservations if any were made
    if (event && bookingId) {
      await Event.findByIdAndUpdate(eventId, {
        $pull: { bookedSeats: { booking: bookingId } }
      });
    }

    res.status(500).json({
      message: "Payment processing failed",
      error: error.message
    });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      const { eventId, bookingId } = paymentIntent.metadata;

      const updatedEvent = await Event.findOneAndUpdate(
        { 
          'bookings._id': bookingId,
          'bookings.paymentStatus': 'pending'
        },
        { 
          $set: { 
            'bookings.$.paymentStatus': 'paid',
            'bookings.$.paymentId': paymentIntentId,
            'bookings.$.paymentMethod': paymentIntent.payment_method_types[0],
            'bookings.$.transactionDate': new Date()
          },
          $pull: { bookedSeats: { booking: bookingId } }
        },
        { new: true }
      );

      if (!updatedEvent) {
        return res.status(404).json({ message: "Booking not found or already processed" });
      }

      res.status(200).json({
        message: "Payment verified successfully",
        paymentId: paymentIntentId,
        booking: updatedEvent.bookings.find(b => b._id.toString() === bookingId)
      });
    } else {
      res.status(400).json({
        message: "Payment verification failed",
        error: "Payment not successful",
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      message: "Failed to verify payment",
      error: error.message
    });
  }
});

// Verify payment status
router.get('/:eventId/payment/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { eventId, bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const event = await Event.findById(eventId)
      .populate('bookings.user', 'name email')
      .populate('organizer', 'name email profileImage');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const booking = event.bookings.id(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Add event details to the booking response
    const bookingResponse = {
      ...booking.toObject(),
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        organizer: event.organizer
      }
    };

    res.status(200).json({
      paymentStatus: booking.paymentStatus,
      booking: bookingResponse
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      message: "Failed to verify payment",
      error: error.message
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment success
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    try {
      const { eventId, bookingId, userId } = paymentIntent.metadata;

      if (!eventId || !bookingId || !userId) {
        console.error('Missing metadata in payment intent:', paymentIntent.metadata);
        return res.status(400).json({ message: "Missing required metadata" });
      }

      const updatedEvent = await Event.findOneAndUpdate(
        { 
          _id: eventId,
          'bookings._id': bookingId,
          'bookings.paymentStatus': 'pending'
        },
        { 
          $set: { 
            'bookings.$.paymentStatus': 'paid',
            'bookings.$.paymentId': paymentIntent.id,
            'bookings.$.paymentMethod': paymentIntent.payment_method_types[0],
            'bookings.$.transactionDate': new Date()
          },
          $pull: { bookedSeats: { booking: bookingId } },
          $addToSet: { attendees: userId }
        },
        { new: true }
      );

      if (!updatedEvent) {
        console.error('Booking not found or already processed:', {
          eventId,
          bookingId,
          userId
        });
        return res.status(404).json({ message: "Booking not found or already processed" });
      }

      console.log('Payment webhook processed successfully for booking:', bookingId);
      return res.status(200).json({ message: "Payment processed successfully" });

    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ 
        message: "Failed to process webhook",
        error: error.message 
      });
    }
  }

  res.json({ received: true });
});

// Recovery endpoint to check payment status
router.get('/:bookingId/recover', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    // Find all events that might have this booking
    const event = await Event.findOne({
      'bookings._id': bookingId,
      'bookings.user': userId
    });

    if (!event) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = event.bookings.id(bookingId);
    
    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({
        status: 'paid',
        booking: booking.toObject()
      });
    }

    // Check with Stripe if payment exists
    if (booking.paymentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update our records
        const updatedEvent = await Event.findOneAndUpdate(
          { 'bookings._id': bookingId },
          { 
            $set: { 
              'bookings.$.paymentStatus': 'paid',
              'bookings.$.transactionDate': new Date()
            },
            $pull: { bookedSeats: { booking: bookingId } },
            $addToSet: { attendees: userId }
          },
          { new: true }
        );

        return res.status(200).json({
          status: 'paid',
          booking: updatedEvent.bookings.id(bookingId).toObject()
        });
      }
    }

    res.status(200).json({
      status: booking.paymentStatus,
      booking: booking.toObject()
    });

  } catch (error) {
    console.error('Recovery error:', error);
    res.status(500).json({
      message: "Failed to recover booking status",
      error: error.message
    });
  }
});

// Backend route example
router.get('/bookings/my-bookings', async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const bookings = await Booking.find({ user: userId })
      .populate('event', 'title date time')
      .populate('seats')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// Verify payment for a specific booking
router.post('/bookings/:bookingId/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      eventId,
      seats,
      totalAmount,
      ticketNumber,
      paymentIntentId
    } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(bookingId) || 
        !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // Find and update the booking
    const updatedEvent = await Event.findOneAndUpdate(
      { 
        _id: eventId,
        'bookings._id': bookingId
      },
      {
        $set: {
          'bookings.$.paymentStatus': 'paid',
          'bookings.$.paymentId': paymentIntentId,
          'bookings.$.transactionDate': new Date()
        },
        $pull: { bookedSeats: { booking: bookingId } },
        $addToSet: { attendees: req.user.userId }
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updatedBooking = updatedEvent.bookings.id(bookingId);

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message
    });
  }
});

export default router; 