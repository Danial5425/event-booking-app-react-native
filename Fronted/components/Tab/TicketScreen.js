import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../../config";

const API_BASE_URL = config.API_BASE_URL;

export default function TicketScreen({ navigation, route }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  // Refresh tickets when navigating back to this screen
  useEffect(() => {
    if (route.params?.refresh) {
      fetchTickets();
    }
  }, [route.params?.refresh]);
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      
      if (!token || !userId) {
        navigation.navigate("Login");
        return;
      }
  
      const response = await axios.get(`${API_BASE_URL}/bookings/my-bookings`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      // console.log("API Response:", JSON.stringify(response.data, null, 2)); // Debug log
  
      // Handle both array response and object with data property
      const responseData = response.data.data || response.data;
      const bookingsData = Array.isArray(responseData) ? responseData : [];
  
      const transformedTickets = bookingsData.map(booking => {
        // Ensure we have proper event data
        const eventData = booking.event || {};
        
        return {
          _id: booking._id,
          event: {
            title: eventData.title || 'Event',
            date: eventData.date || booking.bookingDate,
            time: eventData.time || '',
            imageUrl: eventData.imageUrl,
            location: eventData.location || { address: 'Location not available' },
            organizer: eventData.organizer || { name: 'Organizer' }
          },
          status: booking.paymentStatus || 'paid',
          seats: booking.seats || [],
          totalAmount: booking.totalAmount || 0,
          ticketNumber: booking.ticketNumber || `TKT-${Math.random().toString(36).substring(2, 10)}`,
          paymentMethod: booking.paymentMethod || 'card',
          transactionDate: booking.transactionDate || booking.bookingDate
        };
      });
  
      // console.log("Transformed Tickets:", transformedTickets); // Debug log
      setTickets(transformedTickets);
      
    } catch (error) {
      console.error("Error fetching tickets:", error);
      let errorMessage = "Failed to load tickets. Please try again later.";
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = "Session expired. Please login again.";
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("userId");
          navigation.navigate("Login");
        } else {
          errorMessage = error.response?.data?.message || 
                        `Error: ${error.response?.statusText || 'Unknown error'}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Helper function to transform booking data
  const transformBooking = (booking) => {
    return {
      _id: booking._id,
      event: {
        title: booking.event?.title || 'Event',
        date: booking.event?.date || booking.createdAt,
        time: booking.event?.time || '',
        imageUrl: booking.event?.imageUrl,
        location: booking.event?.location || { address: 'Location not available' },
        organizer: booking.event?.organizer || { name: 'Organizer' }
      },
      status: booking.paymentStatus || 'paid',
      seats: booking.seats || [],
      totalAmount: booking.totalAmount || 0,
      ticketNumber: booking.ticketNumber || `TKT-${Math.random().toString(36).substring(2, 10)}`,
      paymentMethod: booking.paymentMethod || 'card',
      transactionDate: booking.transactionDate || booking.createdAt
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const cancelTicket = async (ticketId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      Alert.alert(
        "Cancel Ticket",
        "Are you sure you want to cancel this ticket?",
        [
          {
            text: "No",
            style: "cancel"
          },
          {
            text: "Yes",
            onPress: async () => {
              try {
                const response = await axios.post(
                  `${API_BASE_URL}/bookings/cancel/${ticketId}`,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );

                if (response.data.success) {
                  Alert.alert("Success", "Ticket cancelled successfully");
                  fetchTickets(); // Refresh the ticket list
                }
              } catch (error) {
                console.error("Error cancelling ticket:", error);
                Alert.alert(
                  "Error",
                  error.response?.data?.message || "Failed to cancel ticket. Please try again."
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in cancelTicket:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => navigation.navigate("TicketDetails", { 
        ticket: item,
        refreshKey: Date.now()
      })}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.eventTitle}>{item.event.title}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'paid' && styles.statusBadgePaid,
          item.status === 'pending' && styles.statusBadgePending,
          item.status === 'cancelled' && styles.statusBadgeCancelled
        ]}>
          <Text style={[
            styles.status,
            { 
              color: item.status === 'paid' ? '#4CAF50' : 
                     item.status === 'pending' ? '#F76B45' : '#666'
            }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.ticketDetails}>
        <Text style={styles.detailText}>
          Date: {new Date(item.event.date).toLocaleDateString()}
        </Text>
        <Text style={styles.detailText}>
          Time: {item.event.time}
        </Text>
        <Text style={styles.detailText}>
          Seats: {item.seats.map(seat => `${seat.seatNumber} (${seat.type})`).join(', ')}
        </Text>
        <Text style={styles.detailText}>
          Amount: ₹{item.totalAmount}
        </Text>
        <Text style={styles.detailText}>
          Ticket #: {item.ticketNumber}
        </Text>
        {item.paymentMethod && (
          <Text style={styles.detailText}>
            Payment: {item.paymentMethod.toUpperCase()}
          </Text>
        )}
        {item.transactionDate && (
          <Text style={styles.detailText}>
            Booked: {new Date(item.transactionDate).toLocaleString()}
          </Text>
        )}
      </View>

      {item.status === 'paid' && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => cancelTicket(item._id)}
        >
          <Text style={styles.cancelButtonText}>Cancel Ticket</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F76B45" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTickets}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Tickets</Text>
      {tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tickets found</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate("Customer")}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.ticketList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#F76B45"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#020b73",
    marginBottom: 20,
  },
  ticketList: {
    paddingBottom: 20,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#020b73",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9'
  },
  statusBadgePending: {
    backgroundColor: '#FFF8E1'
  },
  statusBadgeCancelled: {
    backgroundColor: '#FFEBEE'
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  ticketDetails: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: "#F76B45",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#F76B45",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
