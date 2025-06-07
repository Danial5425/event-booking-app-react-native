import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../config';

const API_BASE_URL = config.API_BASE_URL;

export default function MyTickets({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('userId');
        
        const response = await axios.get(`${API_BASE_URL}/users/${userId}/tickets`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setTickets(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity
      style={styles.ticketItem}
      onPress={() => navigation.navigate('Ticket', { ticket: item })}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.eventTitle}>{item.event.title}</Text>
        <Text style={styles.ticketNumber}>#{item.ticketNumber}</Text>
      </View>
      
      <View style={styles.ticketDetails}>
        <Text style={styles.eventDate}>
          {new Date(item.event.date).toLocaleDateString()} at {item.event.time}
        </Text>
        <Text style={styles.seatInfo}>
          {item.seats.length} seat(s): {item.seats.map(s => s.seatId).join(', ')}
        </Text>
        <Text style={styles.totalPrice}>
          Total: {formatPrice(item.totalAmount)}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          item.paymentStatus === 'paid' ? styles.paidBadge : styles.pendingBadge
        ]}>
          <Text style={styles.statusText}>
            {item.paymentStatus.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Tickets</Text>
      
      {tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You don't have any tickets yet</Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.ticketList}
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
    marginBottom: 20,
    color: '#333',
  },
  ticketList: {
    paddingBottom: 20,
  },
  ticketItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#666',
  },
  ticketDetails: {
    marginTop: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  seatInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  totalPrice: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: 'bold',
    marginTop: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  paidBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: '#FFC107',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    width: '70%',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(price);
} 