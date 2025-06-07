import React from 'react';
import { View, Text, StyleSheet, Image, Share, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRoute } from '@react-navigation/native';

export default function TicketScreen() {
  const route = useRoute();
  const { ticket } = route.params;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ticket for ${ticket.event.title}!\nTicket #: ${ticket.ticketNumber}\nSeats: ${ticket.seats.map(s => s.seatId).join(', ')}`,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ticketContainer}>
        <View style={styles.ticketHeader}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          <Text style={styles.ticketNumber}>Ticket #{ticket.ticketNumber}</Text>
        </View>
        
        <View style={styles.qrContainer}>
          <QRCode
            value={ticket.ticketNumber}
            size={150}
            color="black"
            backgroundColor="white"
          />
        </View>
        
        <View style={styles.ticketDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(ticket.event.date).toLocaleDateString()} at {ticket.event.time}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{ticket.event.location.address}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seats:</Text>
            <Text style={styles.detailValue}>
              {ticket.seats.map(seat => seat.seatId).join(', ')}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{ticket.seats[0].type}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Paid:</Text>
            <Text style={[styles.detailValue, styles.totalPrice]}>
              {formatPrice(ticket.totalAmount)}
            </Text>
          </View>
        </View>
        
        <View style={styles.organizerContainer}>
          <Image
            source={{ uri: ticket.event.organizer.profileImage }}
            style={styles.organizerImage}
          />
          <Text style={styles.organizerName}>{ticket.event.organizer.name}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share Ticket</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  ticketContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  ticketNumber: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  ticketDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#333',
  },
  detailValue: {
    flex: 1,
    color: '#555',
  },
  totalPrice: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  organizerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  organizerName: {
    fontSize: 16,
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  shareButtonText: {
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