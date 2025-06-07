import mongoose from "mongoose";

const SeatTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  color: { type: String, default: '#4F46E5' }
});

const SeatSchema = new mongoose.Schema({
  number: { type: String, required: true }, // Changed to String to allow alphanumeric (A1, B2, etc)
  status: { 
    type: String, 
    enum: ['available', 'booked', 'reserved', 'unavailable'], 
    default: 'available' 
  },
  type: { type: String, required: true }, // Now references seat type name
  price: { type: Number, required: true } // Storing price at time of booking
});

const RowSchema = new mongoose.Schema({
  label: { type: String, required: true },
  seats: [SeatSchema]
});

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  seatTypes: [SeatTypeSchema],
  rows: [RowSchema],
  totalSeats: { type: Number, required: true },
  color: { type: String, default: '#4F46E5' }
});

const TicketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, required: true },
  quantitySold: { type: Number, default: 0 },
  seatType: { type: String } // References seat type name if applicable
});

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  seats: [{
    seatId: { type: String, required: true },
    seatNumber: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentId: String,
  paymentMethod: String,
  transactionDate: Date,
  ticketNumber: String,
  bookingDate: {
    type: Date,
    default: Date.now
  }
});

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    displayAddress: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isSeated: { type: Boolean, default: false },
  seatingConfig: {
    sections: [SectionSchema],
    totalSeats: { type: Number, default: 0 }
  },
  generalAdmission: {
    capacity: { type: Number, default: 0 },
    price: { type: Number, default: 0 }
  },
  ticketTypes: [TicketTypeSchema],
  bookings: [BookingSchema],
  bookedSeats: [{
    seatId: String,
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  isActive: { type: Boolean, default: true }
});

// Add a virtual populate for organizer
EventSchema.virtual('organizerDetails', {
  ref: 'User',
  localField: 'organizer',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included when converting to JSON
EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

// Pre-save hook to update timestamps and calculate totals
EventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  
  if (this.isSeated && this.seatingConfig) {
    // Calculate total seats from all sections
    this.seatingConfig.totalSeats = this.seatingConfig.sections.reduce(
      (total, section) => total + section.totalSeats, 0
    );

    // Update seat statuses based on bookings
    this.seatingConfig.sections.forEach(section => {
      if (section.rows && section.rows.length > 0) {
        section.rows.forEach(row => {
          row.seats.forEach(seat => {
            const isBooked = this.bookedSeats.some(bs => bs.seatId === `${row.label}${seat.number}`);
            if (isBooked) {
              seat.status = 'booked';
            }
          });
        });
      }
    });
  }
  
  next();
});

const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

export { Event };

export const cleanupExpiredReservations = async () => {
  try {
    console.log('Starting cleanup of expired seat reservations...');
    
    const result = await Event.updateMany(
      { 
        'bookedSeats.expiresAt': { $lt: new Date() },
        'bookings.paymentStatus': 'pending'
      },
      { 
        $pull: { 
          bookedSeats: { 
            expiresAt: { $lt: new Date() }
          }
        }
      }
    );

    console.log('Cleanup completed:', {
      matched: result.matchedCount,
      modified: result.modifiedCount
    });

    return result;
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    throw error;
  }
};

export const startCleanupJob = () => {
  setInterval(async () => {
    try {
      const result = await Event.updateMany(
        { 
          'bookedSeats.expiresAt': { $lt: new Date() },
          'bookings.paymentStatus': 'pending'
        },
        { 
          $pull: { 
            bookedSeats: { expiresAt: { $lt: new Date() } },
            bookings: { paymentStatus: 'pending' }
          }
        }
      );
      // console.log('Cleanup completed:', result);
    } catch (error) {
      // console.error('Cleanup error:', error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
};