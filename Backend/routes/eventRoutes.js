import express from "express";
import { Event } from "../Models/EventModel.js";
import { User } from "../Models/User.js";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import { Booking } from "../Models/BookingModel.js";

const router = express.Router();

// Create a new event
// Helper function to generate seat layout
const generateSeatLayout = (seatTypes, rows, seatsPerRow) => {
  const rowsArray = [];
  let seatNumber = 1;
  
  for (let i = 0; i < rows; i++) {
    const rowLabel = String.fromCharCode(65 + i); // A, B, C, etc.
    const seats = [];
    
    for (let j = 0; j < seatsPerRow; j++) {
      // Determine seat type based on distribution
      let typeIndex = 0;
      if (seatNumber <= seatTypes[0].quantity) typeIndex = 0;
      else if (seatNumber <= seatTypes[0].quantity + seatTypes[1].quantity) typeIndex = 1;
      else typeIndex = 2;
      
      seats.push({
        number: `${rowLabel}${j + 1}`,
        type: seatTypes[typeIndex].name,
        price: seatTypes[typeIndex].price,
        status: 'available'
      });
      
      seatNumber++;
    }
    
    rowsArray.push({
      label: rowLabel,
      seats
    });
  }
  
  return rowsArray;
};

// Create a new event
router.post('/Create-Event', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      category,
      imageUrl,
      isSeated,
      seatingConfig,
      generalAdmission
    } = req.body;
    
    const organizer = req.user.userId;

    // Validate required fields
    if (!title || !description || !date || !time || !location || !category || !imageUrl) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify the organizer exists
    const userExists = await User.findById(organizer);
    if (!userExists) {
      return res.status(400).json({ message: 'Organizer not found' });
    }

    // Validate seating configuration based on event type
    if (isSeated) {
      if (!seatingConfig || !seatingConfig.sections || seatingConfig.sections.length === 0 || 
          !seatingConfig.sections[0].seatTypes || seatingConfig.sections[0].seatTypes.length === 0) {
        return res.status(400).json({ message: 'Seated events require seat types configuration' });
      }
    } else {
      if (!generalAdmission || generalAdmission.capacity === undefined || generalAdmission.price === undefined) {
        return res.status(400).json({ message: 'General admission events require capacity and price' });
      }
    }

    // Create seat layout if seated event
    let sections = [];
    if (isSeated && seatingConfig) {
      const seatTypes = seatingConfig.sections[0].seatTypes;
      const totalSeats = seatTypes.reduce((sum, type) => sum + (parseInt(type.quantity) || 0), 0);
      const seatsPerRow = seatingConfig.seatsPerRow || 10;
      const rows = Math.ceil(totalSeats / seatsPerRow);
      
      sections = [{
        name: seatingConfig.sections[0].name || 'Main Section',
        seatTypes: seatTypes,
        rows: generateSeatLayout(seatTypes, rows, seatsPerRow),
        totalSeats: totalSeats,
        color: '#4F46E5'
      }];
    }

    // Create ticket types
    const ticketTypes = isSeated 
      ? seatingConfig.sections[0].seatTypes.map(type => ({
          name: type.name,
          description: `${type.name} seating`,
          price: parseFloat(type.price) || 0,
          quantityAvailable: parseInt(type.quantity) || 0,
          quantitySold: 0,
          seatType: type.name
        }))
      : [{
          name: 'General Admission',
          description: 'General admission ticket',
          price: generalAdmission.price,
          quantityAvailable: generalAdmission.capacity,
          quantitySold: 0
        }];

    // Create new event
    const newEvent = new Event({
      title,
      description,
      date: new Date(date),
      time,
      location,
      category,
      imageUrl,
      organizer,
      isSeated,
      seatingConfig: isSeated ? { sections, totalSeats: sections.reduce((sum, sec) => sum + sec.totalSeats, 0) } : null,
      generalAdmission: !isSeated ? generalAdmission : null,
      ticketTypes
    });

    const savedEvent = await newEvent.save();

    // Populate organizer details in the response
    const populatedEvent = await Event.findById(savedEvent._id)
      .populate('organizer', 'name profileImage email');

    res.status(201).json({
      message: 'Event created successfully',
      event: populatedEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      message: 'Failed to create event',
      error: error.message
    });
  }
});
// Apply authentication middleware to protected routes

router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 20) || 5;
    const skip = (page - 1) * limit;

    const totalEvents = await Event.countDocuments();
    const totalPages = Math.ceil(totalEvents / limit);

    const events = await Event.find()
      .populate("organizer", "name profileImage email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: page,
          totalPages,
          totalEvents,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all events by organizer
router.get("/organizer", authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.userId })
      .populate("organizer", "name profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch events",
      error: error.message,
    });
  }
});

// Search events with filters
router.get("/search", async (req, res) => {
  try {
    const { query, category, dateFrom, dateTo, location, organizer, page = 1, limit = 10 } = req.query;
    
    // Build the filter object with proper validation
    const filter = { isActive: true };
    
    // Text search with multiple fields and fuzzy matching
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'location.address': { $regex: query, $options: 'i' } },
        { 'location.displayAddress': { $regex: query, $options: 'i' } }
      ];
    }
    
    // Category filter with case insensitivity
    if (category) {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    
    // Date range filter with validation
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({ message: 'Invalid start date format' });
        }
        filter.date.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({ message: 'Invalid end date format' });
        }
        filter.date.$lte = toDate;
      }
    }
    
    // Location filter
    if (location) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { 'location.address': { $regex: location, $options: 'i' } },
        { 'location.displayAddress': { $regex: location, $options: 'i' } }
      );
    }
    
    // Organizer filter with ObjectId validation
    if (organizer) {
      if (!mongoose.Types.ObjectId.isValid(organizer)) {
        return res.status(400).json({ message: 'Invalid organizer ID' });
      }
      filter.organizer = organizer;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    
    // Execute the query with pagination
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name email profileImage')
        .sort({ date: 1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Event.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parsedLimit),
        limit: parsedLimit
      }
    });
    
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search events",
      error: error.message
    });
  }
});
// Get categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Event.distinct("category", { isActive: true });
    res.json({
      status: true,
      message: "Categories retrieved successfully",
      data: categories
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
});

// Get single event by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.id)
      .populate("organizer", "name profileImage email mobile")
      .populate("attendees", "name profileImage");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch event",
      error: error.message,
    });
  }
});

// Update an event
// Update your event route in the backend
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Verify the user is the organizer
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this event" });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("organizer", "name profileImage");

    res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update event",
      error: error.message,
    });
  }
});

// Delete an event
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete event",
      error: error.message,
    });
  }
});

// Add attendee to event
router.post("/:id/attendees", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const event = await Event.findById(id);
    const user = await User.findById(userId);

    if (!event || !user) {
      return res.status(404).json({ message: "Event or user not found" });
    }

    // Check if user is already an attendee (safe ObjectId comparison)
    const alreadyAttending = event.attendees.some(
      (attendeeId) => attendeeId.toString() === userId
    );

    if (alreadyAttending) {
      return res
        .status(400)
        .json({ message: "User already attending this event" });
    }

    event.attendees.push(userId);
    await event.save();

    res.status(200).json({
      message: "User added to event attendees",
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add attendee",
      error: error.message,
    });
  }
});

// Get seat map for an event
router.get("/:eventId/seats", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.isSeated) {
      return res.status(400).json({ message: "This event does not have seat assignments" });
    }

    // Get all bookings for this event to determine seat status
    const bookings = await Booking.find({ 
      event: eventId,
      status: { $in: ['confirmed', 'pending'] }
    });

    // Create a map of booked seats
    const bookedSeats = new Map();
    bookings.forEach(booking => {
      booking.seats.forEach(seat => {
        // Use seat number as the key for consistency
        bookedSeats.set(seat.seatNumber, seat.status || 'booked');
      });
    });

    // Transform the seating configuration into the expected format
    const seatMapData = {
      rows: event.seatingConfig.sections[0].rows.map(row => ({
        rowId: row.label,
        rowName: row.label,
        seats: row.seats.map(seat => ({
          seatId: seat.number, // Use seat number as seatId
          seatNumber: seat.number,
          status: bookedSeats.get(seat.number) || 'available',
          type: seat.type
        }))
      }))
    };

    res.status(200).json(seatMapData);
  } catch (error) {
    console.error("Error fetching seat map:", error);
    res.status(500).json({
      message: "Failed to fetch seat map",
      error: error.message
    });
  }
});

// Get event attendees
router.get("/:eventId/attendees", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId)
      .populate({
        path: 'bookings',
        match: { paymentStatus: 'paid' },
        populate: {
          path: 'user',
          select: 'name email mobile'
        }
      });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Verify that the requesting user is the organizer
    if (event.organizer.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to view attendees" });
    }

    // Transform the data to include booking information
    const attendees = event.bookings.map(booking => ({
      _id: booking.user._id,
      name: booking.user.name,
      email: booking.user.email,
      mobile: booking.user.mobile,
      bookingDate: booking.bookingDate,
      seats: booking.seats,
      ticketNumber: booking.ticketNumber
    }));

    res.status(200).json({
      success: true,
      attendees
    });

  } catch (error) {
    console.error("Error fetching attendees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendees",
      error: error.message
    });
  }
});

// Admin route to get all events with attendees
router.get("/admin/events", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized. Admin access required." });
    }

    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 20) || 10;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find()
        .populate("organizer", "name email profileImage")
        .populate({
          path: 'bookings',
          match: { paymentStatus: 'paid' },
          populate: {
            path: 'user',
            select: 'name email mobile'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments()
    ]);

    // Transform the data to include attendee counts
    const transformedEvents = events.map(event => ({
      ...event,
      attendeeCount: event.bookings?.length || 0,
      totalRevenue: event.bookings?.reduce((sum, booking) => sum + booking.totalAmount, 0) || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        events: transformedEvents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalEvents: total,
          limit
        }
      }
    });
  } catch (error) {
    console.error("Error fetching admin events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message
    });
  }
});

// Admin route to get event details with attendees
router.get("/admin/events/:eventId", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized. Admin access required." });
    }

    const event = await Event.findById(req.params.eventId)
      .populate("organizer", "name email profileImage")
      .populate({
        path: 'bookings',
        match: { paymentStatus: 'paid' },
        populate: {
          path: 'user',
          select: 'name email mobile'
        }
      });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Transform the data to include detailed attendee information
    const attendees = event.bookings.map(booking => ({
      _id: booking.user._id,
      name: booking.user.name,
      email: booking.user.email,
      mobile: booking.user.mobile,
      bookingDate: booking.bookingDate,
      seats: booking.seats,
      ticketNumber: booking.ticketNumber,
      totalAmount: booking.totalAmount
    }));

    const eventDetails = {
      ...event.toObject(),
      attendees,
      attendeeCount: attendees.length,
      totalRevenue: attendees.reduce((sum, attendee) => sum + attendee.totalAmount, 0)
    };

    res.status(200).json({
      success: true,
      data: eventDetails
    });
  } catch (error) {
    console.error("Error fetching admin event details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event details",
      error: error.message
    });
  }
});

// Admin route to update any event
router.put("/admin/events/:eventId", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized. Admin access required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.eventId,
      req.body,
      { new: true, runValidators: true }
    ).populate("organizer", "name email profileImage");

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
      error: error.message
    });
  }
});

// Admin route to delete any event
router.delete("/admin/events/:eventId", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized. Admin access required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Delete the event
    await Event.findByIdAndDelete(req.params.eventId);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
      error: error.message
    });
  }
});

export default router;
