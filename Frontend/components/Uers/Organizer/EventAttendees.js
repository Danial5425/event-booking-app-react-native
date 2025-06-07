import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import config from '../../../config';
import { useTheme } from '../../../context/ThemeContext';

const API_BASE_URL = config.API_BASE_URL;
const { width } = Dimensions.get('window');

export default function EventAttendees({ visible, onClose, eventId, organizerId }) {
  const { theme } = useTheme();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchAttendees();
    }
  }, [visible]);

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/events/${eventId}/attendees`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAttendees(response.data.attendees);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      Alert.alert('Error', 'Failed to fetch attendees');
    } finally {
      setLoading(false);
    }
  };

  const renderAttendeeItem = ({ item }) => (
    <View style={[styles.attendeeItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.attendeeInfo}>
        <Text style={[styles.attendeeName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.attendeeEmail, { color: theme.secondaryText }]}>{item.email}</Text>
        {item.mobile && (
          <Text style={[styles.attendeePhone, { color: theme.secondaryText }]}>
            <Ionicons name="call-outline" size={14} color={theme.secondaryText} /> {item.mobile}
          </Text>
        )}
      </View>
      <View style={[styles.bookingInfo, { borderTopColor: theme.border }]}>
        <Text style={[styles.bookingDate, { color: theme.secondaryText }]}>
          Booked: {new Date(item.bookingDate).toLocaleDateString()}
        </Text>
        {item.seats?.map((seat, index) => (
          <View key={index} style={styles.seatContainer}>
            <View style={[styles.seatTypeIndicator, { backgroundColor: getSeatTypeColor(seat.type) }]} />
            <Text style={[styles.seatInfo, { color: theme.primary }]}>
              {seat.seatNumber} - {seat.type}
            </Text>
          </View>
        ))}
        <Text style={[styles.ticketNumber, { color: theme.primary }]}>
          Ticket: {item.ticketNumber}
        </Text>
      </View>
    </View>
  );

  const getSeatTypeColor = (type) => {
    // Map seat types to colors
    const colorMap = {
      'VIP': '#4F46E5',    // Indigo
      'Gold': '#F59E0B',   // Amber
      'Silver': '#6B7280', // Gray
      'Bronze': '#B45309', // Brown
      'Standard': '#10B981' // Green
    };
    return colorMap[type] || '#4F46E5'; // Default to indigo if type not found
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Event Attendees</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={attendees}
              renderItem={renderAttendeeItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color={theme.secondaryText} />
                  <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No attendees yet</Text>
                </View>
              }
            />
          )}
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
    height: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  attendeeItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  attendeeInfo: {
    marginBottom: 8,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  attendeeEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bookingInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  bookingDate: {
    fontSize: 12,
    color: '#666',
  },
  seatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  seatTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  seatInfo: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  attendeePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketNumber: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 2,
    fontWeight: '500',
  },
}); 