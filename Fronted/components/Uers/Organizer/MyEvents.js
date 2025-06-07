import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../../config';
import EventAttendees from './EventAttendees';
import { useTheme } from '../../../context/ThemeContext';

const API_BASE_URL = config.API_BASE_URL;
const { width } = Dimensions.get('window');

const calculateTotalSeats = (event) => {
  if (event.isSeated && event.seatingConfig?.sections) {
    return event.seatingConfig.sections.reduce(
      (total, section) => total + section.seatTypes.reduce(
        (sectionSum, type) => sectionSum + (type.quantity || 0), 0
      ), 0
    );
  }
  return event.generalAdmission?.capacity || 0;
};

const getBasePrice = (event) => {
  if (event.isSeated && event.seatingConfig?.sections?.length > 0) {
    // Find the lowest price among all seat types
    const allSeatPrices = event.seatingConfig.sections.flatMap(section => 
      section.seatTypes.map(type => type.price)
    );
    return Math.min(...allSeatPrices);
  }
  return event.generalAdmission?.price || 0;
};

const countTicketTypes = (event) => {
  if (event.isSeated && event.seatingConfig?.sections?.length > 0) {
    // Count all unique seat types across sections
    const seatTypes = new Set();
    event.seatingConfig.sections.forEach(section => {
      section.seatTypes.forEach(type => seatTypes.add(type.name));
    });
    return seatTypes.size;
  }
  return 1; // General admission has 1 ticket type
};

const getStatusColor = (date) => {
  const eventDate = new Date(date);
  const now = new Date();
  
  if (eventDate < now) {
    return '#EF4444'; // Past event - Red
  } else if (eventDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return '#F59E0B'; // Upcoming within 7 days - Yellow
  }
  return '#10B981'; // Future event - Green
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const EventItem = React.memo(({ item, onEdit, onDelete, onViewAttendees }) => {
  const { theme } = useTheme();
  const totalSeats = calculateTotalSeats(item);
  const basePrice = getBasePrice(item);
  const ticketTypeCount = countTicketTypes(item);

  return (
    <View style={[styles.eventCard, { backgroundColor: theme.background }]}>
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage}
        resizeMode="cover"
      />
      
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.date) }]}>
        <Text style={styles.statusText}>
          {new Date(item.date) < new Date() ? 'Past' : 'Upcoming'}
        </Text>
      </View>

      <View style={styles.eventDetails}>
        <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.secondaryText} />
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]}>{formatDate(item.date)} at {item.time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={theme.secondaryText} />
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]}>{item.location.address}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={16} color={theme.secondaryText} />
          <Text style={[styles.eventPrice, { color: theme.primary }]}>₹{basePrice}</Text>
        </View>

        <View style={[styles.statsContainer, { borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalSeats}</Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Capacity</Text>
          </View>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => onViewAttendees(item._id, item.organizer)}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>{item.attendees?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Attendees</Text>
          </TouchableOpacity>
          {item.isSeated && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{item.seatingConfig?.sections?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Sections</Text>
            </View>
          )}
        </View>

        <View style={styles.tagsContainer}>
          <View style={[styles.tag, { backgroundColor: theme.background }]}>
            <Text style={[styles.tagText, { color: theme.primary }]}>{item.category}</Text>
          </View>
          {item.isSeated && (
            <View style={[styles.tag, styles.seatedTag, { backgroundColor: theme.background }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>Seated Event</Text>
            </View>
          )}
          {ticketTypeCount > 1 && (
            <View style={[styles.tag, styles.ticketTag, { backgroundColor: theme.background }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>{ticketTypeCount} Ticket Types</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={() => onEdit(item._id)}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.background }]}
            onPress={() => onDelete(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function MyEvents() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');
  const [showAttendees, setShowAttendees] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          fetchMyEvents(storedToken);
        } else {
          navigation.navigate('Login');
        }
      } catch (error) {
        console.error('Error getting token:', error);
        Alert.alert('Error', 'Failed to authenticate. Please login again.');
      }
    };
    getToken();
  }, []);

  const fetchMyEvents = async (authToken) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/events/organizer`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        await AsyncStorage.removeItem('token');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', 'Failed to fetch your events. Please try again.');
      }
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyEvents(token);
  };

  const deleteEvent = async (eventId) => {
    try {
      await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      Alert.alert('Success', 'Event deleted successfully');
      fetchMyEvents(token);
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    }
  };

  const confirmDelete = (eventId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteEvent(eventId), style: 'destructive' },
      ]
    );
  };

  const handleViewAttendees = (eventId, organizerId) => {
    setSelectedEventId(eventId);
    setSelectedOrganizerId(organizerId);
    setShowAttendees(true);
  };

  const renderEventItem = ({ item }) => (
    <EventItem 
      item={item}
      onEdit={(eventId) => navigation.navigate('EditEvent', { eventId })}
      onDelete={confirmDelete}
      onViewAttendees={handleViewAttendees}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Events</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          events.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.text }]}>You haven't created any events yet</Text>
            <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
              Start by creating your first event and manage all your events in one place
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <Text style={styles.createButtonText}>Create Your First Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <EventAttendees
        visible={showAttendees}
        onClose={() => setShowAttendees(false)}
        eventId={selectedEventId}
        organizerId={selectedOrganizerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventDetails: {
    padding: 15,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    marginTop: 5,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  seatedTag: {
    backgroundColor: '#F0FDF4',
  },
  ticketTag: {
    backgroundColor: '#FEF3C7',
  },
  tagText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    flex: 0.48,
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 5,
    color: '#4F46E5',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    color: '#EF4444',
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: width - 60,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});