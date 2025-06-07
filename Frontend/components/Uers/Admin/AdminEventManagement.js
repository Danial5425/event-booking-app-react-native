import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  TextInput,
  ScrollView,
  RefreshControl,
  Linking,
  SafeAreaView,
  StatusBar
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../context/ThemeContext';

const AdminEventManagement = () => {
  const { theme } = useTheme();
  const [state, setState] = useState({
    events: [],
    loading: true,
    error: null,
    selectedEvent: null,
    showDetails: false,
    editModalVisible: false,
    page: 1,
    totalPages: 1,
    refreshing: false,
    loadingMore: false
  });

  const {
    events,
    loading,
    error,
    selectedEvent,
    showDetails,
    editModalVisible,
    page,
    totalPages,
    refreshing,
    loadingMore
  } = state;

  // Fetch events
  const fetchEvents = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      setState(prev => ({
        ...prev,
        error: null,
        loading: pageNum === 1 && !isRefreshing,
        refreshing: isRefreshing,
        loadingMore: pageNum > 1
      }));

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${config.API_BASE_URL}/events/admin/events`, {
        params: { page: pageNum, limit: 10 },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch events');
      }

      const { events: eventData, pagination } = response.data.data;
      
      setState(prev => ({
        ...prev,
        events: pageNum === 1 ? eventData : [...prev.events, ...eventData],
        totalPages: pagination?.totalPages || 1,
        page: pageNum,
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || error.message || 'Failed to fetch events',
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
    }
  }, []);

  // Add function to open location in maps
  const openLocationInMaps = (location) => {
    if (!location?.address) {
      Alert.alert('Error', 'No location available for this event');
      return;
    }

    const encodedAddress = encodeURIComponent(location.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    Linking.canOpenURL(mapsUrl).then(supported => {
      if (supported) {
        Linking.openURL(mapsUrl);
      } else {
        Alert.alert('Error', 'Could not open maps application');
      }
    });
  };

  // Update event
  const updateEvent = async (eventId, updatedData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${config.API_BASE_URL}/events/admin/events/${eventId}`,
        updatedData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Event updated successfully');
        setState(prev => ({
          ...prev,
          editModalVisible: false,
          events: prev.events.map(event => 
            event._id === eventId ? response.data.data : event
          )
        }));
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update event');
    }
  };

  // Delete event
  const deleteEvent = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setState(prev => ({ ...prev, loading: true }));
              const token = await AsyncStorage.getItem('token');
              const response = await axios.delete(
                `${config.API_BASE_URL}/events/admin/events/${eventId}`,
                {
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              );

              if (response.data.success) {
                Alert.alert(
                  'Success',
                  'Event deleted successfully',
                  [{ text: 'OK' }]
                );
                setState(prev => ({
                  ...prev,
                  events: prev.events.filter(event => event._id !== eventId),
                  loading: false
                }));
              }
            } catch (error) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to delete event',
                [{ text: 'OK' }]
              );
              setState(prev => ({ ...prev, loading: false }));
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  // Handlers
  const handleRefresh = () => fetchEvents(1, true);
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchEvents(page + 1);
    }
  };

  const showEventDetails = (event) => {
    if (!event) return;
    setState(prev => ({
      ...prev,
      selectedEvent: event,
      showDetails: true
    }));
  };

  const closeEventDetails = () => {
    setState(prev => ({
      ...prev,
      showDetails: false,
      selectedEvent: null
    }));
  };

  const showEditModal = (event) => {
    console.log('Showing edit modal for:', event);
    if (!event) {
      console.error('No event data provided to showEditModal');
      return;
    }
    setState(prev => {
      console.log('Setting edit modal visible to true');
      return {
        ...prev,
        selectedEvent: event,
        editModalVisible: true
      };
    });
  };

  const closeEditModal = () => {
    console.log('Closing edit modal');
    setState(prev => ({
      ...prev,
      editModalVisible: false,
      selectedEvent: null
    }));
  };

  // Effects
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Render functions
  const renderEventItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.eventCard, { backgroundColor: theme.background }]}
      onPress={() => showEventDetails(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage}
        resizeMode="cover"
      />
      <View style={styles.eventInfoContainer}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.eventMetaContainer}>
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]}>
            <Icon name="person" size={14} color={theme.secondaryText} /> {item.organizer?.name || 'N/A'}
          </Text>
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]}>
            <Icon name="calendar-today" size={14} color={theme.secondaryText} /> {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.locationInfo, { backgroundColor: theme.border }]}
          onPress={(e) => {
            e.stopPropagation();
            openLocationInMaps(item.location);
          }}
        >
          <Icon name="location-on" size={14} color={theme.primary} />
          <Text style={[styles.eventInfo, styles.locationText, { color: theme.primary }]} numberOfLines={1}>
            {item.location?.address || 'Location not specified'}
          </Text>
        </TouchableOpacity>
        <View style={styles.eventStatsContainer}>
          <Text style={[styles.eventStat, { color: theme.secondaryText }]}>
            <Icon name="people" size={14} color={theme.secondaryText} /> {item.attendeeCount || 0} Attendees
          </Text>
          <Text style={[styles.eventStat, styles.revenueText, { color: theme.primary }]}>
            <Icon name="currency-rupee" size={14} color={theme.primary} /> ₹{item.totalRevenue || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEventDetails = () => {
    if (!showDetails || !selectedEvent) return null;

    return (
      <SafeAreaView style={[styles.fullScreenContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />
        <View style={[styles.fullScreenHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={closeEventDetails}
          >
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.fullScreenTitle, { color: theme.text }]}>Event Details</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.fullScreenContent}>
          <Image 
            source={{ uri: selectedEvent.imageUrl }} 
            style={styles.fullScreenImage}
            resizeMode="cover"
          />
          
          <View style={styles.fullScreenInfo}>
            <Text style={[styles.fullScreenEventTitle, { color: theme.text }]}>{selectedEvent.title}</Text>
            
            <View style={styles.fullScreenDetailRow}>
              <Icon name="date-range" size={20} color={theme.secondaryText} />
              <Text style={[styles.fullScreenDetailText, { color: theme.secondaryText }]}>
                {new Date(selectedEvent.date).toLocaleDateString()}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.fullScreenLocationRow, { backgroundColor: theme.border }]}
              onPress={() => openLocationInMaps(selectedEvent.location)}
            >
              <Icon name="location-on" size={20} color={theme.primary} />
              <Text style={[styles.fullScreenLocationText, { color: theme.primary }]} numberOfLines={2}>
                {selectedEvent.location?.address || 'Location not specified'}
              </Text>
              <Icon name="directions" size={24} color={theme.primary} />
            </TouchableOpacity>
            
            <View style={[styles.fullScreenStatsContainer, { backgroundColor: theme.border }]}>
              <View style={styles.fullScreenStatItem}>
                <Text style={[styles.fullScreenStatValue, { color: theme.text }]}>
                  {selectedEvent.attendeeCount || 0}
                </Text>
                <Text style={[styles.fullScreenStatLabel, { color: theme.secondaryText }]}>Attendees</Text>
              </View>
              <View style={styles.fullScreenStatItem}>
                <Text style={[styles.fullScreenStatValue, { color: theme.text }]}>
                  ₹{selectedEvent.totalRevenue || 0}
                </Text>
                <Text style={[styles.fullScreenStatLabel, { color: theme.secondaryText }]}>Revenue</Text>
              </View>
            </View>

            <Text style={[styles.fullScreenSectionTitle, { color: theme.text }]}>Description</Text>
            <Text style={[styles.fullScreenDescription, { color: theme.secondaryText }]}>
              {selectedEvent.description}
            </Text>

            <View style={styles.fullScreenActions}>
              <TouchableOpacity 
                style={[styles.fullScreenActionButton, styles.editButton, { borderColor: theme.primary }]}
                onPress={() => {
                  closeEventDetails();
                  showEditModal(selectedEvent);
                }}
              >
                <Icon name="edit" size={24} color={theme.primary} />
                <Text style={[styles.fullScreenActionText, { color: theme.primary }]}>
                  Edit Event
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.fullScreenActionButton, styles.deleteButton, { borderColor: theme.error }]}
                onPress={() => {
                  Alert.alert(
                    'Delete Event',
                    'Are you sure you want to delete this event? This action cannot be undone.',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel'
                      },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          closeEventDetails();
                          deleteEvent(selectedEvent._id);
                        }
                      }
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Icon name="delete" size={24} color={theme.error} />
                <Text style={[styles.fullScreenActionText, { color: theme.error }]}>
                  Delete Event
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={closeEditModal}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Event</Text>
            <TouchableOpacity onPress={closeEditModal}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          {selectedEvent && (
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Event Title"
                placeholderTextColor={theme.secondaryText}
                value={selectedEvent.title}
                onChangeText={(text) => setState(prev => ({
                  ...prev,
                  selectedEvent: { ...prev.selectedEvent, title: text }
                }))}
              />
              
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Event Description"
                placeholderTextColor={theme.secondaryText}
                value={selectedEvent.description}
                multiline
                numberOfLines={4}
                onChangeText={(text) => setState(prev => ({
                  ...prev,
                  selectedEvent: { ...prev.selectedEvent, description: text }
                }))}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Event Date (YYYY-MM-DD)"
                placeholderTextColor={theme.secondaryText}
                value={new Date(selectedEvent.date).toISOString().split('T')[0]}
                onChangeText={(text) => setState(prev => ({
                  ...prev,
                  selectedEvent: { ...prev.selectedEvent, date: text }
                }))}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Event Time"
                placeholderTextColor={theme.secondaryText}
                value={selectedEvent.time}
                onChangeText={(text) => setState(prev => ({
                  ...prev,
                  selectedEvent: { ...prev.selectedEvent, time: text }
                }))}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Location"
                placeholderTextColor={theme.secondaryText}
                value={selectedEvent.location?.address}
                onChangeText={(text) => setState(prev => ({
                  ...prev,
                  selectedEvent: { 
                    ...prev.selectedEvent, 
                    location: { ...prev.selectedEvent.location, address: text }
                  }
                }))}
              />
              
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={() => updateEvent(selectedEvent._id, selectedEvent)}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading events...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Icon name="error-outline" size={50} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {showDetails ? (
        renderEventDetails()
      ) : (
        <>
          <Text style={[styles.title, { color: theme.text }]}>Admin Event Management</Text>
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
                <Icon name="event-busy" size={50} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No events found</Text>
              </View>
            }
          />
          {renderEditModal()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  eventCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  eventInfoContainer: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventMetaContainer: {
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 13,
    marginBottom: 4,
  },
  eventStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventStat: {
    fontSize: 14,
  },
  revenueText: {
    fontWeight: 'bold',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 6,
  },
  locationText: {
    marginLeft: 8,
    flex: 1,
  },
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullScreenContent: {
    flex: 1,
  },
  fullScreenImage: {
    width: '100%',
    height: 300,
  },
  fullScreenInfo: {
    padding: 20,
  },
  fullScreenEventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fullScreenDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fullScreenDetailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  fullScreenLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fullScreenLocationText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  fullScreenStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  fullScreenStatItem: {
    alignItems: 'center',
  },
  fullScreenStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullScreenStatLabel: {
    fontSize: 16,
    marginTop: 4,
  },
  fullScreenSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  fullScreenDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  fullScreenActions: {
    marginTop: 24,
    gap: 12,
  },
  fullScreenActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fullScreenActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 16,
    width: '95%',
    height: '95%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    paddingVertical: 10,
  },
  input: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default AdminEventManagement; 