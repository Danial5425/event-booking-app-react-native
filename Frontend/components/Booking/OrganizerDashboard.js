import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../config';

const API_BASE_URL = config.API_BASE_URL;

export default function OrganizerDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchOrganizerEvents = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/events/organizer`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setEvents(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching organizer events:', error);
        setLoading(false);
      }
    };

    fetchOrganizerEvents();
  }, []);

  const fetchEventBookings = async (eventId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/events/${eventId}/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setBookings(response.data);
      setSelectedEvent(eventId);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching event bookings:', error);
      setLoading(false);
    }
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.eventItem,
        selectedEvent === item._id && styles.selectedEventItem
      ]}
      onPress={() => fetchEventBookings(item._id)}
    >
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDate}>
        {new Date(item.date).toLocaleDateString()}
      </Text>
      <Text style={styles.bookingCount}>
        {item.bookings?.length || 0} bookings
      </Text>
    </TouchableOpacity>
  );

  const renderBookingItem = ({ item }) => (
    <View style={styles.bookingItem}>
      <Text style={styles.bookingHeader}>
        Booking #{item.ticketNumber} - {item.paymentStatus.toUpperCase()}
      </Text>
      <View style={styles.bookingDetails}>
        <Text style={styles.bookingText}>
          User: {item.user.name} ({item.user.email})
        </Text>
        <Text style={styles.bookingText}>
          Seats: {item.seats.map(s => s.seatId).join(', ')}
        </Text>
        <Text style={styles.bookingText}>
          Total: {formatPrice(item.totalAmount)}
        </Text>
        <Text style={styles.bookingText}>
          Booked on: {new Date(item.bookingDate).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Events</Text>
      
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventList}
      />
      
      <Text style={styles.subHeader}>
        {selectedEvent ? 'Bookings' : 'Select an event to view bookings'}
      </Text>
      
      {loading && bookings.length === 0 ? (
        <ActivityIndicator size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.bookingList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No bookings for this event</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 15,
    color: '#555',
  },
  eventList: {
    paddingBottom: 10,
  },
  eventItem: {
    width: 200,
    padding: 15,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedEventItem: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bookingCount: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  bookingList: {
    paddingBottom: 20,
  },
  bookingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  bookingDetails: {
    paddingLeft: 5,
  },
  bookingText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(price);
} 