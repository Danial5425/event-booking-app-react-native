import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking,
  Dimensions,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import config from '../config';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const API_BASE_URL = config.API_BASE_URL;

export default function TicketDetailsScreen({ route, navigation }) {
  const { ticket, onRefresh } = route.params;
  const [loading, setLoading] = useState({
    download: false,
    email: false,
    share: false,
    print: false
  });

  // Add console.log to debug organizer data
  // console.log('Ticket Data:', JSON.stringify(ticket, null, 2));
  // console.log('Organizer Data:', JSON.stringify(ticket?.event?.organizer, null, 2));

  const handleDownloadTicket = async () => {
    try {
      setLoading(prev => ({ ...prev, download: true }));
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/bookings/ticket/${ticket._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(response.data);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        
        // Save the file locally
        const fileUri = `${FileSystem.documentDirectory}${ticket.ticketNumber}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: FileSystem.EncodingType.Base64
        });

        // Check if we can share (iOS/Android)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share Ticket for ${ticket.event.title}`,
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert(
            'Download Complete',
            `Ticket saved to ${fileUri}`,
            [{ text: 'OK' }]
          );
        }
      };
    } catch (error) {
      console.error('Error downloading ticket:', error);
      Alert.alert('Error', 'Failed to download ticket. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, download: false }));
    }
  };

  const handlePrintTicket = async () => {
    try {
      setLoading(prev => ({ ...prev, print: true }));
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/bookings/ticket/${ticket._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );

      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(response.data);
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
      });

      await Print.printAsync({
        uri: `data:application/pdf;base64,${base64Data}`,
        orientation: 'portrait'
      });
    } catch (error) {
      console.error('Error printing ticket:', error);
      Alert.alert('Error', 'Failed to print ticket. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, print: false }));
    }
  };

  const handleEmailTicket = async () => {
    try {
      setLoading(prev => ({ ...prev, email: true }));
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/bookings/email-ticket/${ticket._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Ticket has been sent to your email.');
      }
    } catch (error) {
      console.error('Error sending ticket:', error);
      Alert.alert('Error', 'Failed to send ticket. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handleShare = async () => {
    try {
      setLoading(prev => ({ ...prev, share: true }));
      const message = `I'm attending ${ticket.event.title} on ${new Date(ticket.event.date).toLocaleDateString()} at ${ticket.event.time}. Location: ${ticket.event.location.address}`;
      
      await Share.share({
        message,
        title: 'My Event Ticket',
        url: ticket.event.imageUrl // Optional: include event image URL
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Error', 'Failed to share ticket. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, share: false }));
    }
  };

  const openMaps = () => {
    if (ticket.event.location.coordinates) {
      const { latitude, longitude } = ticket.event.location.coordinates;
      const url = Platform.select({
        ios: `maps://?q=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(ticket.event.title)})`
      });
      
      Linking.openURL(url).catch(() => {
        // Fallback to web URL
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      });
    } else {
      // Fallback to address search
      const url = Platform.select({
        ios: `maps://?q=${encodeURIComponent(ticket.event.location.address)}`,
        android: `geo:0,0?q=${encodeURIComponent(ticket.event.location.address)}`
      });
      
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open maps application');
      });
    }
  };

  const handleEmailPress = (email) => {
    if (email && email !== 'N/A') {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Alert.alert('Error', 'Could not open email client');
      });
    }
  };

  const handlePhonePress = (phone) => {
    if (phone && phone !== 'N/A') {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Could not open phone dialer');
      });
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons 
            name="arrow-back" 
            size={isTablet ? 30 : 24} 
            color="#020b73" 
          />
        </TouchableOpacity>
        <Text style={styles.title}>Ticket Details</Text>
      </View>

      <View style={styles.ticketContainer}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          <View style={[
            styles.statusBadge,
            ticket.status === 'paid' && styles.statusBadgePaid,
            ticket.status === 'pending' && styles.statusBadgePending,
            ticket.status === 'cancelled' && styles.statusBadgeCancelled
          ]}>
            <Text style={styles.statusText}>
              {ticket.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Event Image */}
        {ticket.event.imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: ticket.event.imageUrl }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Event Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          <DetailRow 
            icon="calendar"
            text={new Date(ticket.event.date).toLocaleDateString()}
          />
          
          <DetailRow 
            icon="time"
            text={ticket.event.time}
          />
          
          <DetailRow 
            icon="location"
            text={ticket.event.location.address}
            onPress={openMaps}
            isLink
          />
          
          {ticket.event.location.coordinates && ticket.event.location.coordinates.latitude && ticket.event.location.coordinates.longitude && (
            <DetailRow 
              icon="navigate"
              text={`${ticket.event.location.coordinates.latitude.toFixed(4)}, ${ticket.event.location.coordinates.longitude.toFixed(4)}`}
              onPress={openMaps}
              isLink
            />
          )}
        </View>

        {/* Organizer Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Organizer Details</Text>
          
          {/* Show profile image if available */}
          {ticket?.event?.organizer?.profileImage && (
            <Image
              source={{ uri: ticket.event.organizer.profileImage }}
              style={styles.organizerImage}
            />
          )}
          
          {/* <DetailRow 
            icon="person"
            text={`Name: ${ticket?.event?.organizer?.name || 'Not provided'}`}
          /> */}
          
          <DetailRow 
            icon="mail"
            text={`Email: ${ticket?.event?.organizer?.email || 'Not provided'}`}
            onPress={() => handleEmailPress(ticket?.event?.organizer?.email)}
            isLink={!!ticket?.event?.organizer?.email}
          />
          
          <DetailRow 
            icon="call"
            text={`Phone: ${ticket?.event?.organizer?.mobile || 'Not provided'}`}
            onPress={() => handlePhonePress(ticket?.event?.organizer?.mobile)}
            isLink={!!ticket?.event?.organizer?.mobile}
          />

          {/* {ticket?.event?.organizer?.address && (
            <DetailRow 
              icon="location"
              text={`Address: ${ticket.event.organizer.address}`}
            />
          )}

          {ticket?.event?.organizer?.bio && (
            <DetailRow 
              icon="information-circle"
              text={`Bio: ${ticket.event.organizer.bio}`}
            />
          )} */}
        </View>

        {/* Seat Information Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Seat Information</Text>
          {ticket.seats.map((seat, index) => (
            <DetailRow 
              key={index}
              icon="seat"
              text={`Seat ${seat.seatNumber} (${seat.type})`}
            />
          ))}
        </View>

        {/* Booking Information Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          
          <DetailRow 
            icon="ticket"
            text={`Ticket #: ${ticket.ticketNumber}`}
          />
          
          <DetailRow 
            icon="cash"
            text={`Amount: ₹${ticket.totalAmount}`}
          />
          
          <DetailRow 
            icon="card"
            text={`Payment: ${ticket.paymentMethod?.toUpperCase() || 'N/A'}`}
          />
          
          <DetailRow 
            icon="calendar"
            text={`Booked: ${new Date(ticket.transactionDate).toLocaleString()}`}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <ActionButton
            icon="download"
            label="Download"
            onPress={handleDownloadTicket}
            loading={loading.download}
            color="#4CAF50"
          />
          
          <ActionButton
            icon="print"
            label="Print"
            onPress={handlePrintTicket}
            loading={loading.print}
            color="#2196F3"
          />
          
          <ActionButton
            icon="mail"
            label="Email"
            onPress={handleEmailTicket}
            loading={loading.email}
            color="#FF9800"
          />
          
          <ActionButton
            icon="share-social"
            label="Share"
            onPress={handleShare}
            loading={loading.share}
            color="#9C27B0"
          />
        </View>
      </View>
    </ScrollView>
  );
}

// Reusable DetailRow component
const DetailRow = ({ icon, text, onPress, isLink }) => (
  <TouchableOpacity 
    style={styles.detailRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={isLink ? 0.7 : 1}
  >
    <Ionicons 
      name={icon === 'seat' ? 'ticket' : icon} 
      size={isTablet ? 24 : 20} 
      color={isLink ? '#2196F3' : '#666'} 
    />
    <Text style={[
      styles.detailText,
      isLink && styles.linkText
    ]}>
      {text}
    </Text>
  </TouchableOpacity>
);

// Reusable ActionButton component
const ActionButton = ({ icon, label, onPress, loading, color }) => (
  <TouchableOpacity 
    style={[styles.actionButton, { backgroundColor: color }]}
    onPress={onPress}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <>
        <Ionicons name={icon} size={24} color="#fff" />
        <Text style={styles.actionButtonText}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTablet ? 24 : 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: isTablet ? 24 : 16,
  },
  title: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#020b73',
  },
  ticketContainer: {
    margin: isTablet ? 24 : 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: isTablet ? 24 : 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 24 : 20,
  },
  eventTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#020b73',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 20,
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgePending: {
    backgroundColor: '#FFF8E1',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  imageContainer: {
    height: isTablet ? 200 : 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: isTablet ? 24 : 20,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  detailsSection: {
    marginBottom: isTablet ? 28 : 24,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#020b73',
    marginBottom: isTablet ? 16 : 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 12 : 8,
    paddingVertical: isTablet ? 8 : 4,
  },
  detailText: {
    fontSize: isTablet ? 18 : 16,
    color: '#666',
    marginLeft: isTablet ? 16 : 12,
    flexShrink: 1,
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  actionButtons: {
    marginTop: isTablet ? 32 : 24,
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 20 : 16,
    borderRadius: 8,
    marginBottom: isTablet ? 0 : 12,
    width: isTablet ? '48%' : '100%',
    marginHorizontal: isTablet ? 4 : 0,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  organizerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 16,
  },
});