import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  FlatList
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import config from "../../../config";
import SeatSelectionModal from './SeatSelectionModal';
import { initPaymentSheet, presentPaymentSheet } from '../../../utils/stripe';
import { useStripe } from '@stripe/stripe-react-native';

const API_BASE_URL = config.API_BASE_URL;
const { width } = Dimensions.get("window");

export default function EventDetailsScreen({ navigation }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeatType, setSelectedSeatType] = useState(null);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatMapData, setSeatMapData] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [seatCount, setSeatCount] = useState(1);
  const route = useRoute();
  const { eventId } = route.params;

  const stripe = useStripe();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigation.navigate("Login");
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const eventData = response.data.data || response.data;
        setEvent(eventData);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event details:", error);
        Alert.alert("Error", "Failed to load event details");
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const fetchSeatMap = async (seatType) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/events/${eventId}/seats`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          seatType: seatType // Add seat type as query parameter
        }
      });

      if (!response.data || !response.data.rows) {
        throw new Error('Invalid seat data received');
      }

      // Transform the response data into the expected format
      const seatMapData = {
        rows: response.data.rows.map(row => ({
          rowId: row.label || row.rowId,
          rowName: row.label || row.rowName,
          seats: row.seats.map(seat => ({
            seatId: `${row.label || row.rowId}${seat.number || seat.seatNumber}`,
            seatNumber: seat.number || seat.seatNumber,
            status: seat.status || 'available', // Default to available if status not provided
            type: seat.type || seatType
          }))
        }))
      };

      setSeatMapData(seatMapData);
      setShowSeatModal(true);
    } catch (error) {
      console.error("Error fetching seat map:", error);
      Alert.alert(
        "Error Loading Seats",
        "Failed to load seat map. Please try again.",
        [
          {
            text: "Retry",
            onPress: () => fetchSeatMap(seatType)
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleSeatTypeSelect = (seatType) => {
    setSelectedSeatType(seatType);
    setSelectedSeats([]); // Reset selected seats when changing type
    fetchSeatMap(seatType);
  };

  const handleSeatsSelected = (seats) => {
    setSelectedSeats(seats);
    setShowSeatModal(false);
  };

  const handleAttend = async () => {
    try {
      if (!stripe) {
        Alert.alert("Payment Error", "Stripe is not initialized correctly.");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      setLoading(true);
      
      // Calculate total amount
      const totalAmount = selectedSeats.reduce((sum, seat) => {
        const seatType = getSeatTypes().find(type => type.name === selectedSeatType);
        return sum + (seatType?.price || 0);
      }, 0);

      // Initialize payment
      const paymentResponse = await axios.post(
        `${API_BASE_URL}/payments/${eventId}/payment`,
        {
          seats: selectedSeats.map(seat => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            type: selectedSeatType,
            price: getSeatTypes().find(type => type.name === selectedSeatType)?.price || 0
          })),
          totalAmount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!paymentResponse.data.clientSecret) {
        throw new Error('No client secret received from payment initialization');
      }

      // Initialize payment sheet
      const initResult = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentResponse.data.clientSecret,
        merchantDisplayName: "Event Booking App",
        style: 'automatic',
        paymentMethodTypes: ['card'],
      });

      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      // Present payment sheet
      const { error } = await stripe.presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          Alert.alert("Payment Cancelled", "You cancelled the payment");
        } else {
          Alert.alert("Payment Error", error.message || "Payment failed");
        }
        return;
      }

      // Verify payment with backend
      const bookingId = paymentResponse.data.bookingId;
      if (!bookingId) {
        throw new Error('No booking ID received from payment initialization');
      }

      const verifyResponse = await axios.post(
        `${API_BASE_URL}/payments/bookings/${bookingId}/verify-payment`,
        {
          eventId,
          seats: selectedSeats.map(seat => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            type: selectedSeatType,
            price: getSeatTypes().find(type => type.name === selectedSeatType)?.price || 0
          })),
          totalAmount,
          ticketNumber: paymentResponse.data.ticketNumber,
          paymentIntentId: paymentResponse.data.clientSecret.split('_secret_')[0],
          paymentStatus: 'paid'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (verifyResponse.data.success) {
        // Clear selected seats after successful booking
        setSelectedSeats([]);
        setSelectedSeatType(null);
        
        Alert.alert(
          "Booking Successful",
          "Your booking has been confirmed!",
          [
            {
              text: "View Tickets",
              onPress: () => navigation.navigate('MyTickets', { refresh: true })
            },
            { text: "OK" }
          ]
        );
      } else {
        throw new Error(verifyResponse.data.message || "Payment verification failed");
      }

    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "An unexpected error occurred during payment.";
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || `Request failed with status code ${error.response?.status || "unknown"}.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert("Payment Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "Free";
    return price.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleEmailPress = () => {
    if (event?.organizer?.email) {
      Linking.openURL(`mailto:${event.organizer.email}`);
    }
  };

  const handlePhonePress = () => {
    if (event?.organizer?.mobile) {
      Linking.openURL(`tel:${event.organizer.mobile}`);
    }
  };

  const handleMapPress = () => {
    if (event?.location?.coordinates) {
      const { lat, lng } = event.location.coordinates;
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  const getAvailableSeats = () => {
    if (!event.isSeated) return event.generalAdmission?.capacity || 0;
    
    return event.seatingConfig?.sections?.reduce((total, section) => {
      return total + section.seatTypes.reduce((sum, type) => sum + type.quantity, 0);
    }, 0) || 0;
  };

  const getSeatTypes = () => {
    if (!event || !event.isSeated) return [];
    
    const seatTypes = [];
    event.seatingConfig?.sections?.forEach(section => {
      section.seatTypes.forEach(type => {
        // Check if seats are available for this type
        const availableSeats = type.quantity || 0;
        if (availableSeats > 0) {
          seatTypes.push({
            name: type.name,
            price: type.price,
            quantity: availableSeats,
            color: type.color,
            sectionName: section.name
          });
        }
      });
    });
    
    return seatTypes;
  };

  const renderSeatMap = () => {
    if (!seatMapData) return null;

    return (
      <View style={styles.seatMapContainer}>
        <Text style={styles.sectionTitle}>Select Your Seats ({selectedSeatType})</Text>
        <Text style={styles.seatSelectionHint}>
          {selectedSeats.length} seat(s) selected
        </Text>
        
        {/* Screen/Stage representation */}
        <View style={styles.stage}>
          <Text style={styles.stageText}>STAGE</Text>
        </View>
        
        {/* Seat grid */}
        <View style={styles.seatGrid}>
          {seatMapData.rows.map((row) => (
            <View key={row.rowId} style={styles.seatRow}>
              <Text style={styles.rowLabel}>{row.rowName}</Text>
              <View style={styles.seatsInRow}>
                {row.seats.map((seat) => {
                  const isSelected = selectedSeats.some(
                    (s) => s.seatId === seat.seatId
                  );
                  const isAvailable = seat.status === "available";
                  
                  return (
                    <TouchableOpacity
                      key={seat.seatId}
                      style={[
                        styles.seat,
                        isSelected && styles.selectedSeat,
                        !isAvailable && styles.reservedSeat,
                      ]}
                      onPress={() => {
                        if (!isAvailable) return;
                        
                        setSelectedSeats((prev) =>
                          isSelected
                            ? prev.filter((s) => s.seatId !== seat.seatId)
                            : [...prev, seat]
                        );
                      }}
                      disabled={!isAvailable}
                    >
                      <Text style={[
                        styles.seatText,
                        isSelected && styles.selectedSeatText
                      ]}>
                        {seat.seatNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F76B45" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const seatTypes = getSeatTypes();
  const availableSeats = getAvailableSeats();

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />

      <View style={styles.contentContainer}>
        <Text style={styles.eventTitle}>{event.title}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(event.date).toLocaleDateString()} at {event.time}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>
            {event.location?.address || "Location not specified"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Available Seats:</Text>
          <Text style={styles.detailValue}>{availableSeats}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{event.category}</Text>
        </View>

        {/* Seat Type Selection for seated events */}
        {event.isSeated && seatTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Seat Types</Text>
            <FlatList
              data={seatTypes}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.seatTypeItem,
                    { 
                      borderColor: selectedSeatType === item.name ? '#4F46E5' : '#ddd',
                      backgroundColor: selectedSeatType === item.name ? '#EEF2FF' : '#fff'
                    }
                  ]}
                  onPress={() => handleSeatTypeSelect(item.name)}
                >
                  <View style={[styles.seatTypeColor, { backgroundColor: item.color }]} />
                  <View style={styles.seatTypeInfo}>
                    <Text style={styles.seatTypeName}>{item.name}</Text>
                    <Text style={styles.seatTypeSection}>{item.sectionName}</Text>
                  </View>
                  <View style={styles.seatTypePrice}>
                    <Text style={styles.seatTypePriceText}>{formatPrice(item.price)}</Text>
                    <Text style={styles.seatTypeQuantity}>{item.quantity} seats available</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.seatTypeList}
            />
          </View>
        )}

        {/* Selected Seats Summary */}
        {selectedSeats.length > 0 && (
          <View style={styles.selectedSeatsSummary}>
            <Text style={styles.summaryTitle}>Selected Seats:</Text>
            <Text style={styles.summaryText}>
              {selectedSeats.map(seat => `${seat.seatId}`).join(', ')}
            </Text>
            <TouchableOpacity
              style={styles.changeSeatsButton}
              onPress={() => setShowSeatModal(true)}
            >
              <Text style={styles.changeSeatsButtonText}>Change Seats</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seat Map */}
        {showSeatMap && renderSeatMap()}

        {/* Seat Count Selection */}
        {event.isSeated && selectedSeatType && (
          <View style={styles.seatCountContainer}>
            <Text style={styles.seatCountLabel}>Number of Seats:</Text>
            <View style={styles.seatCountControls}>
              <TouchableOpacity 
                style={styles.seatCountButton} 
                onPress={() => setSeatCount(Math.max(1, seatCount - 1))}
                disabled={seatCount <= 1}
              >
                <Ionicons name="remove" size={20} color="#F76B45" />
              </TouchableOpacity>
              <Text style={styles.seatCountText}>{seatCount}</Text>
              <TouchableOpacity 
                style={styles.seatCountButton} 
                onPress={() => setSeatCount(seatCount + 1)}
                disabled={seatCount >= (selectedSeatType ? 
                  seatTypes.find(st => st.name === selectedSeatType)?.quantity || 1 : 
                  availableSeats)}
              >
                <Ionicons name="add" size={20} color="#F76B45" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Map View */}
        {event.location?.coordinates && (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Event Location</Text>
            <TouchableOpacity onPress={handleMapPress}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: event.location.coordinates.lat,
                  longitude: event.location.coordinates.lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: event.location.coordinates.lat,
                    longitude: event.location.coordinates.lng,
                  }}
                  title={event.title}
                  description={event.location.address}
                />
              </MapView>
              <Text style={styles.mapHint}>
                Tap on map to open in Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>About the Event</Text>
        <Text style={styles.eventDescription}>{event.description}</Text>

        <Text style={styles.sectionTitle}>Organizer Details</Text>
        <View style={styles.organizerContainer}>
          <Image
            source={{ uri: event.organizer?.profileImage }}
            style={styles.organizerImage}
          />
          <View style={styles.organizerDetails}>
            <Text style={styles.organizerName}>
              {event.organizer?.name || "Organizer"}
            </Text>

            <View style={styles.contactContainer}>
              <TouchableOpacity
                style={styles.contactItem}
                onPress={handleEmailPress}
              >
                <FontAwesome name="envelope" size={16} color="#666" />
                <Text style={styles.contactText}>
                  {event.organizer?.email || "Email not provided"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactItem}
                onPress={handlePhonePress}
              >
                <MaterialIcons name="phone" size={16} color="#666" />
                <Text style={styles.contactText}>
                  {event.organizer?.mobile || "Phone not provided"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.attendButton,
            (loading || selectedSeats.length === 0) && styles.disabledButton
          ]}
          onPress={handleAttend}
          disabled={loading || selectedSeats.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.attendButtonText}>
              {`Book ${selectedSeats.length} Seat(s)`}
            </Text>
          )}
        </TouchableOpacity>

        {event.isSeated && !selectedSeatType && (
          <Text style={styles.seatSelectionHint}>
            Please select a seat type before registering
          </Text>
        )}
      </View>

      {/* Seat Selection Modal */}
      <SeatSelectionModal
        visible={showSeatModal}
        onClose={() => setShowSeatModal(false)}
        seatType={selectedSeatType}
        onSeatsSelected={handleSeatsSelected}
        seatMapData={seatMapData}
        selectedSeats={selectedSeats}
        setSelectedSeats={setSelectedSeats}
        eventId={eventId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventImage: {
    width: "100%",
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#020b73",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: "bold",
    width: 120,
    color: "#333",
  },
  detailValue: {
    flex: 1,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#020b73",
  },
  eventDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
    marginBottom: 10,
  },
  organizerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 20,
  },
  organizerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  contactContainer: {
    marginTop: 5,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 10,
    color: "#666",
  },
  attendButton: {
    backgroundColor: "#F76B45",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  attendButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "red",
  },
  mapContainer: {
    marginVertical: 15,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  mapHint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    fontStyle: "italic",
  },
  seatTypeList: {
    marginTop: 10,
  },
  seatTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  seatTypeColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  seatTypeInfo: {
    flex: 1,
  },
  seatTypeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  seatTypeSection: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  seatTypePrice: {
    alignItems: 'flex-end',
  },
  seatTypePriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  seatTypeQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  seatSelectionHint: {
    color: '#F76B45',
    textAlign: 'center',
    marginBottom: 20,
  },
  seatCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  seatCountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  seatCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatCountButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F76B45',
    marginHorizontal: 10,
  },
  seatCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  seatMapContainer: {
    marginVertical: 20,
    maxHeight: 500,
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
  reservedSeat: {
    backgroundColor: '#f44336',
    opacity: 0.6,
  },
  seatText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 10,
  },
  selectedSeatText: {
    color: '#fff',
  },
  selectedSeatsSummary: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  changeSeatsButton: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  changeSeatsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});