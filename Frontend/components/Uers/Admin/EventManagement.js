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
  Dimensions,
  RefreshControl,
  ScrollView,
  TextInput,
  SafeAreaView,
  Linking
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Constants
const PAGE_SIZE = 10;
const CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  currencyDisplay: 'symbol'
};

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', CURRENCY_OPTIONS).format(amount);
};

const PAYMENT_METHODS = {
  card: { icon: 'credit-card', label: 'Card' },
  credit_card: { icon: 'credit-card', label: 'Card' },
  debit_card: { icon: 'credit-card', label: 'Card' },
  upi: { icon: 'smartphone', label: 'UPI' },
  netbanking: { icon: 'account-balance', label: 'Net Banking' },
  wallet: { icon: 'account-balance-wallet', label: 'Wallet' },
  default: { icon: 'payment', label: 'Unknown' }
};

const getPaymentMethodDetails = (method) => {
  if (!method) return PAYMENT_METHODS.default;
  return PAYMENT_METHODS[method.toLowerCase()] || {
    icon: 'payment',
    label: method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()
  };
};

export default function EventManagement() {
  const { theme } = useTheme();
  // State management
  const [state, setState] = useState({
    events: [],
    loading: true,
    error: null,
    selectedEvent: null,
    modalVisible: false,
    attendeesModalVisible: false,
    page: 1,
    totalPages: 1,
    refreshing: false,
    loadingMore: false
  });

  // Destructure state for easier access
  const {
    events,
    loading,
    error,
    selectedEvent,
    modalVisible,
    attendeesModalVisible,
    page,
    totalPages,
    refreshing,
    loadingMore
  } = state;

  // Memoized fetch function using useCallback
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
        params: { page: pageNum, limit: PAGE_SIZE },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch events');
      }

      const { events: eventData, pagination } = response.data.data;
      if (!Array.isArray(eventData)) {
        throw new Error('Invalid events data format');
      }

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
      console.error('Error fetching events:', error);
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || error.message || 'Failed to fetch events',
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
    }
  }, []);

  // Fetch event details
  const fetchEventDetails = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/events/admin/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setState(prev => ({ ...prev, selectedEvent: response.data.data, modalVisible: true }));
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch event details');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch event details');
    }
  };

  // Handlers
  const handleRefresh = () => fetchEvents(1, true);
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchEvents(page + 1);
    }
  };
  const closeModal = () => setState(prev => ({ ...prev, modalVisible: false }));

  const showAttendeesList = (event) => {
    setState(prev => ({
      ...prev,
      selectedEvent: event,
      attendeesModalVisible: true
    }));
  };

  const closeAttendeesModal = () => {
    setState(prev => ({
      ...prev,
      attendeesModalVisible: false
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
      onPress={() => fetchEventDetails(item._id)}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage}
        resizeMode="cover"
        onError={() => console.log("Failed to load event image")}
      />
      <View style={styles.eventInfoContainer}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.eventMetaContainer}>
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]} numberOfLines={1}>
            <Icon name="person" size={14} color={theme.secondaryText} /> {item.organizer?.name || 'N/A'}
          </Text>
          <Text style={[styles.eventInfo, { color: theme.secondaryText }]}>
            <Icon name="calendar-today" size={14} color={theme.secondaryText} /> {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.eventStatsContainer}>
          <TouchableOpacity 
            style={styles.attendeesButton}
            onPress={() => showAttendeesList(item)}
          >
            <Icon name="people" size={14} color={theme.secondaryText} /> 
            <Text style={[styles.eventStat, { color: theme.secondaryText }]}> {item.attendeeCount || 0} Attendees</Text>
          </TouchableOpacity>
          <Text style={[styles.eventStat, styles.revenueText, { color: theme.secondaryText }]}>
            <Icon name="currency-rupee" size={14} color={theme.secondaryText} /> {formatCurrency(item.totalRevenue || 0)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAttendeeItem = ({ item }) => {
    const paymentMethod = getPaymentMethodDetails(item.paymentMethod);
    const isPaid = item.paymentStatus === 'paid';
    const bookingDate = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
    
    return (
      <View style={styles.attendeeItem}>
        <View style={styles.attendeeHeader}>
          <View style={styles.customerInfoContainer}>
            <Text style={[styles.attendeeName, { color: theme.text }]} numberOfLines={1}>
              <Icon name="person" size={16} color={theme.secondaryText} /> {item.name}
            </Text>
            <Text style={[styles.attendeeInfo, { color: theme.secondaryText }]} numberOfLines={1}>
              <Icon name="email" size={14} color={theme.secondaryText} /> {item.email}
            </Text>
            <Text style={[styles.attendeeInfo, { color: theme.secondaryText }]}>
              <Icon name="phone" size={14} color={theme.secondaryText} /> {item.mobile || 'N/A'}
            </Text>
          </View>
          <View style={styles.paymentMethodContainer}>
            <Icon name={paymentMethod.icon} size={18} color={theme.secondaryText} />
            <Text style={[styles.paymentMethodText, { color: theme.secondaryText }]}>{paymentMethod.label}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <Text style={[styles.bookingDate, { color: theme.secondaryText }]}>
            <Icon name="access-time" size={14} color={theme.secondaryText} /> Booked on: {bookingDate}
          </Text>
          <Text style={[styles.ticketNumber, { color: theme.secondaryText }]}>
            <Icon name="confirmation-number" size={14} color={theme.secondaryText} /> Ticket: {item.ticketNumber}
          </Text>
        </View>
        
        <View style={styles.paymentDetails}>
          <View style={styles.paymentStatusContainer}>
            <Text style={[styles.paymentStatus, { color: isPaid ? theme.primary : theme.error, textTransform: 'uppercase' }]}>
              {isPaid ? 'PAID' : 'PENDING'}
            </Text>
            {isPaid && (
              <Text style={[styles.paymentDate, { color: theme.secondaryText }]}>
                <Icon name="check-circle" size={14} color={theme.primary} /> Paid on: {bookingDate}
              </Text>
            )}
          </View>
          <Text style={[styles.attendeeAmount, { color: isPaid ? theme.primary : theme.error }]}>
            <Icon name="currency-rupee" size={14} color={isPaid ? theme.primary : theme.error} /> {formatCurrency(item.totalAmount)}
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const renderPaymentSummary = () => {
    if (!selectedEvent?.bookings?.length) return null;
    
    const paymentSummary = selectedEvent.bookings.reduce((acc, booking) => {
      const method = booking.paymentMethod || 'Unknown';
      acc[method] = (acc[method] || 0) + booking.totalAmount;
      return acc;
    }, {});

    return (
      <View style={styles.paymentSummary}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Summary</Text>
        <View style={styles.paymentMethodsList}>
          {Object.entries(paymentSummary).map(([method, amount]) => {
            const { icon, label } = getPaymentMethodDetails(method);
            return (
              <View key={method} style={styles.paymentMethodSummary}>
                <Text style={[styles.paymentMethodIcon, { color: theme.secondaryText }]}>{icon}</Text>
                <Text style={[styles.paymentMethodText, { color: theme.secondaryText }]}>{label}</Text>
                <Text style={[styles.paymentAmount, { color: theme.secondaryText }]}>{formatCurrency(amount)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

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
        <Text style={[styles.errorText, { color: theme.primary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={handleRefresh}>
          <Text style={[styles.retryButtonText, { color: theme.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Event Management</Text>
      
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Icon name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search events..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

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
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No events found</Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Event Details</Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {selectedEvent && (
              <>
                <Image 
                  source={{ uri: selectedEvent.imageUrl }} 
                  style={styles.modalEventImage}
                  resizeMode="cover"
                  defaultSource={require('../../../assets/placeholder-image.png')}
                />
                
                <Text style={[styles.eventDetailTitle, { color: theme.text }]}>{selectedEvent.title}</Text>
                
                <View style={styles.detailRow}>
                  <Icon name="date-range" size={16} color={theme.secondaryText} />
                  <Text style={[styles.eventDetailInfo, { color: theme.secondaryText }]}>
                    {new Date(selectedEvent.date).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Icon name="location-on" size={16} color={theme.secondaryText} />
                  <Text style={[styles.eventDetailInfo, { color: theme.secondaryText }, { numberOfLines: 2 }]}>
                    {selectedEvent.location?.address || 'Location not specified'}
                  </Text>
                </View>
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{selectedEvent.attendeeCount || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Attendees</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(selectedEvent.totalRevenue)}</Text>
                    <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Revenue</Text>
                  </View>
                </View>

                {renderPaymentSummary()}

                <View style={styles.attendeesSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendees ({selectedEvent.attendees?.length || 0})</Text>
                  <FlatList
                    data={selectedEvent.attendees}
                    renderItem={renderAttendeeItem}
                    keyExtractor={item => `${item._id}-${item.ticketNumber}`}
                    style={styles.attendeesList}
                    contentContainerStyle={styles.attendeesListContent}
                    showsVerticalScrollIndicator={true}
                    ListEmptyComponent={
                      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                        <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No attendees found</Text>
                      </View>
                    }
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Attendees Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendeesModalVisible}
        onRequestClose={closeAttendeesModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attendeesModalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Attendees - {selectedEvent?.title}
              </Text>
              <TouchableOpacity onPress={closeAttendeesModal}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.attendeesStatsContainer}>
              <View style={styles.attendeeStatItem}>
                <Text style={[styles.attendeeStatValue, { color: theme.text }]}>{selectedEvent?.attendeeCount || 0}</Text>
                <Text style={[styles.attendeeStatLabel, { color: theme.secondaryText }]}>Total Attendees</Text>
              </View>
              <View style={styles.attendeeStatItem}>
                <Text style={[styles.attendeeStatValue, { color: theme.text }]}>
                  {formatCurrency(selectedEvent?.totalRevenue || 0)}
                </Text>
                <Text style={[styles.attendeeStatLabel, { color: theme.secondaryText }]}>Total Revenue</Text>
              </View>
            </View>

            <FlatList
              data={selectedEvent?.attendees}
              renderItem={renderAttendeeItem}
              keyExtractor={item => `${item._id}-${item.ticketNumber}`}
              style={styles.attendeesList}
              contentContainerStyle={styles.attendeesListContent}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                  <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No attendees found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles
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
    backgroundColor: 'white',
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
    backgroundColor: '#f0f0f0',
  },
  eventInfoContainer: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventMetaContainer: {
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  eventStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventStat: {
    fontSize: 14,
    color: '#666',
  },
  revenueText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#F76B45',
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
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  footerContainer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalEventImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailInfo: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
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
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paymentSummary: {
    marginBottom: 16,
  },
  paymentMethodsList: {
    marginTop: 8,
  },
  paymentMethodSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentMethodIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
  },
  paymentAmount: {
    marginLeft: 'auto',
    fontWeight: 'bold',
    color: '#333',
  },
  attendeesSection: {
    flex: 1,
    marginTop: 16,
  },
  attendeesList: {
    flex: 1,
    maxHeight: 300,
  },
  attendeesListContent: {
    paddingBottom: 16,
  },
  attendeeItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  attendeeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  bookingDetails: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  bookingDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 13,
    color: '#666',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  paymentStatusContainer: {
    flexDirection: 'column',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  attendeeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendeesModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '95%',
    maxHeight: '90%',
  },
  attendeesStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  attendeeStatItem: {
    alignItems: 'center',
  },
  attendeeStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  attendeeStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalEventImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailInfo: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
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
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paymentSummary: {
    marginBottom: 16,
  },
  paymentMethodsList: {
    marginTop: 8,
  },
  paymentMethodSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentMethodIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
  },
  paymentAmount: {
    marginLeft: 'auto',
    fontWeight: 'bold',
    color: '#333',
  },
  attendeesSection: {
    flex: 1,
    marginTop: 16,
  },
  attendeesList: {
    flex: 1,
    maxHeight: 300,
  },
  attendeesListContent: {
    paddingBottom: 16,
  },
  attendeeItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  attendeeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  bookingDetails: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  bookingDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 13,
    color: '#666',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  paymentStatusContainer: {
    flexDirection: 'column',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  attendeeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendeesModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '95%',
    maxHeight: '90%',
  },
  attendeesStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  attendeeStatItem: {
    alignItems: 'center',
  },
  attendeeStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  attendeeStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});