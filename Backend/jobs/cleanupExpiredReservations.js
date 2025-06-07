import { Event } from '../Models/EventModel.js';
import mongoose from 'mongoose';

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

// Run cleanup every 5 minutes
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
      console.log('Cleanup completed:', result);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}; 