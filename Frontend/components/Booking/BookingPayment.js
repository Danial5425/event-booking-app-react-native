import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../../config';

const API_BASE_URL = config.API_BASE_URL;

export default function BookingPayment({ 
  eventId, 
  selectedSeats, 
  selectedSeatType, 
  totalAmount,
  onBookingComplete,
  onClose 
}) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [booking, setBooking] = useState(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      // Create booking on backend
      const bookingResponse = await axios.post(
        `${API_BASE_URL}/payments/${eventId}/payment`,
        {
          seats: selectedSeats.map(seat => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            type: selectedSeatType,
            price: seat.price
          })),
          totalAmount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const { bookingId, ticketNumber } = bookingResponse.data;
      setBooking(bookingResponse.data);

      // Simulate payment processing
      setTimeout(() => {
        setPaymentStatus('paid');
        onBookingComplete(bookingResponse.data);
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Could not complete payment');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Booking</Text>
          
          <View style={styles.bookingSummary}>
            <Text style={styles.summaryTitle}>Selected Seats:</Text>
            {selectedSeats.map(seat => (
              <Text key={seat.seatId} style={styles.seatText}>
                {seat.seatId} - {selectedSeatType} ({formatPrice(seat.price)})
              </Text>
            ))}
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>{formatPrice(totalAmount)}</Text>
            </View>
          </View>

          {paymentStatus === 'pending' ? (
            <TouchableOpacity 
              style={styles.payButton} 
              onPress={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.payButtonText}>Pay Now</Text>
              )}
            </TouchableOpacity>
          ) : paymentStatus === 'paid' ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Payment Successful!</Text>
              <Text style={styles.ticketText}>Ticket #: {booking?.ticketNumber}</Text>
              <TouchableOpacity 
                style={styles.viewTicketButton}
                onPress={() => {
                  onClose();
                  navigation.navigate('MyTickets');
                }}
              >
                <Text style={styles.viewTicketText}>View Ticket</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.failedContainer}>
              <Text style={styles.failedText}>Payment Failed</Text>
              <TouchableOpacity 
                style={styles.tryAgainButton}
                onPress={handlePayment}
              >
                <Text style={styles.tryAgainText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  bookingSummary: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  seatText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  payButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  ticketText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  viewTicketButton: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  viewTicketText: {
    color: 'white',
    fontWeight: '600',
  },
  failedContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  failedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  tryAgainButton: {
    backgroundColor: '#F76B45',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  tryAgainText: {
    color: 'white',
    fontWeight: '600',
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
});

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(price);
} 