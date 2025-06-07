import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../../config';

const API_BASE_URL = config.API_BASE_URL;
const { width, height } = Dimensions.get('window');

export default function SeatSelectionModal({
  visible,
  onClose,
  seatType,
  onSeatsSelected,
  seatMapData,
  selectedSeats,
  setSelectedSeats,
  eventId
}) {
  const [maxSeats, setMaxSeats] = useState(4); // Default max seats per booking
  const [currentSeatMap, setCurrentSeatMap] = useState(seatMapData);
  const [loading, setLoading] = useState(false);
  const ws = useRef(null); // Use a ref to store the WebSocket instance

  // Update currentSeatMap when seatMapData changes
  useEffect(() => {
    if (seatMapData) {
      setCurrentSeatMap(seatMapData);
    }
  }, [seatMapData]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!visible || !eventId) {
      // If modal is not visible or eventId is missing, close existing connection
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const connectWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.warn('No token found for WebSocket connection');
          // Optionally, show an alert or navigate to login if no token
          Alert.alert('Authentication Error', 'Please log in to get real-time seat updates.');
          return;
        }

        // Pass token as a query parameter (backend needs to support this)
        const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/events/${eventId}/seats?token=${token}`;
        
        // Close any existing connection before creating a new one
        if (ws.current) {
           ws.current.close();
        }

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          // You might want to set loading(false) here if loading was set to true before connecting
        };

        ws.current.onmessage = (event) => {
          try {
            const updatedSeats = JSON.parse(event.data);
            setCurrentSeatMap(prev => {
              if (!prev) return null;
              return {
                ...prev,
                rows: prev.rows.map(row => ({
                  ...row,
                  seats: row.seats.map(seat => {
                    const updatedSeat = updatedSeats.find(s => s.seatNumber === seat.seatNumber);
                    return updatedSeat ? { ...seat, status: updatedSeat.status } : seat;
                  })
                }))
              };
            });
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Alert.alert('WebSocket Error', 'Failed to connect for real-time updates.'); // Removed redundant alert
        };
        
        ws.current.onclose = (event) => {
            ws.current = null; // Clear the ref when closed
            // Handle potential reconnection logic here if needed
            if (!event.wasClean) {
              // Handle abnormal closure, maybe attempt to reconnect
              console.error('WebSocket connection closed unexpectedly');
            }
        };

      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        // Alert.alert('WebSocket Setup Error', 'Failed to set up real-time updates.'); // Optionally alert on setup failure
      }
    };

    connectWebSocket();

    // Cleanup function: This runs when the component unmounts or dependencies change
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };

  }, [visible, eventId]); // Dependencies: re-run effect if visible or eventId changes

  // Calculate total available seats
  const totalAvailableSeats = currentSeatMap?.rows.reduce((total, row) => {
    return total + row.seats.filter(seat => seat.status === 'available').length;
  }, 0) || 0;

  const getSeatStatus = (seat) => {
    // First check if seat is in selectedSeats
    if (selectedSeats.some(s => s.seatNumber === seat.seatNumber)) {
      return 'selected';
    }
    // Then check the seat's status from the backend
    return seat.status || 'available';
  };

  const handleSeatPress = (seat) => {
    // Check if seat is available
    if (seat.status !== 'available') {
      Alert.alert(
        "Seat Unavailable",
        "This seat is already booked or reserved."
      );
      return;
    }

    const isSelected = selectedSeats.some(s => s.seatNumber === seat.seatNumber);
    
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.seatNumber !== seat.seatNumber));
    } else {
      if (selectedSeats.length >= maxSeats) {
        Alert.alert(
          "Maximum Seats Reached",
          `You can only select up to ${maxSeats} seats at a time.`
        );
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      Alert.alert("No Seats Selected", "Please select at least one seat.");
      return;
    }
    onSeatsSelected(selectedSeats);
    onClose();
  };

  const renderSeat = (seat) => {
    const status = getSeatStatus(seat);
    const isDisabled = status === 'booked' || status === 'reserved';
    
    return (
      <TouchableOpacity
        key={seat.seatId}
        style={[
          styles.seat,
          status === 'selected' && styles.selectedSeat,
          status === 'booked' && styles.bookedSeat,
          status === 'reserved' && styles.reservedSeat,
          isDisabled && styles.disabledSeat
        ]}
        onPress={() => !isDisabled && handleSeatPress(seat)}
        disabled={isDisabled}
      >
        <Text style={[
          styles.seatText,
          status === 'selected' && styles.selectedSeatText,
          isDisabled && styles.disabledSeatText
        ]}>
          {seat.seatNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!currentSeatMap || currentSeatMap.rows.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.loadingContainer}>
               {loading ? (
                 <ActivityIndicator size="large" color="#4F46E5" />
               ) : (
                 <Ionicons name="information-circle-outline" size={48} color="#666" />
               )}
              <Text style={styles.loadingText}>
                {loading ? 'Loading seat map...' : 'No seat map available for this event.'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                 <Text style={{ color: '#4F46E5', marginTop: 10 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select Seats - {seatType}</Text>
              <Text style={styles.subtitle}>
                {totalAvailableSeats} seats available
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Seat Map */}
          <ScrollView style={styles.seatMapContainer}>
            {/* Stage */}
            <View style={styles.stage}>
              <Text style={styles.stageText}>STAGE</Text>
            </View>

            {/* Seat Grid */}
            <View style={styles.seatGrid}>
              {currentSeatMap.rows.map((row) => (
                <View key={row.rowId} style={styles.seatRow}>
                  <Text style={[
                    styles.rowLabel,
                    row.rowName.length > 1 && styles.doubleRowLabel
                  ]}>
                    {row.rowName}
                  </Text>
                  <View style={styles.seatsInRow}>
                    {row.seats.map(seat => renderSeat(seat))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.availableSeat]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.selectedSeat]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.bookedSeat]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.reservedSeat]} />
                <Text style={styles.legendText}>Reserved</Text>
              </View>
            </View>

            <View style={styles.selectionInfo}>
              <Text style={styles.selectionText}>
                Selected: {selectedSeats.length} seat(s)
              </Text>
              {selectedSeats.length > 0 && (
                <Text style={styles.selectedSeatsText}>
                  {selectedSeats.map(seat => seat.seatId).join(', ')}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedSeats.length === 0 && styles.disabledButton
                ]}
                onPress={handleConfirm}
                disabled={selectedSeats.length === 0}
              >
                <Text style={styles.confirmButtonText}>Confirm Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 5,
  },
  seatMapContainer: {
    flex: 1,
  },
  stage: {
    backgroundColor: '#ddd',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  stageText: {
    fontWeight: 'bold',
    color: '#333',
  },
  seatGrid: {
    marginTop: 10,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    width: 25,
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  doubleRowLabel: {
    width: 35, // Wider for double-letter row names
  },
  seatsInRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  seat: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    margin: 2,
    borderRadius: 4,
  },
  selectedSeat: {
    backgroundColor: '#4F46E5',
  },
  bookedSeat: {
    backgroundColor: '#f44336',
    opacity: 0.7
  },
  reservedSeat: {
    backgroundColor: '#FFA500',
    opacity: 0.7
  },
  disabledSeat: {
    opacity: 0.5
  },
  seatText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 10,
  },
  selectedSeatText: {
    color: '#fff',
  },
  disabledSeatText: {
    color: '#aaa'
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 20,
    height: 20,
    marginRight: 5,
    borderRadius: 3,
  },
  availableSeat: {
    backgroundColor: '#e0e0e0',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  selectionInfo: {
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectedSeatsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
}); 