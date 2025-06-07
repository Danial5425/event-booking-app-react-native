import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import config from "../../config";
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = config.API_BASE_URL;

const formatPrice = (price) => {
  if (price === undefined || price === null) {
    return 'Price not available';
  }
  return price.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const EventItem = React.memo(({ item, onPress }) => {
  // Get the lowest price for the event
  const getEventPrice = () => {
    if (item.isSeated && item.seatingConfig?.sections) {
      // Find the lowest price among all seat types
      const allSeatPrices = item.seatingConfig.sections
        .filter(section => section?.seatTypes)
        .flatMap(section => 
          section.seatTypes
            .filter(type => typeof type.price === 'number')
            .map(type => type.price)
        );
      return allSeatPrices.length > 0 ? Math.min(...allSeatPrices) : 0;
    }
    return item.generalAdmission?.price || item.basePrice || 0;
  };

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => onPress(item._id)}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage} 
        resizeMode="cover"
      />
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventCategory}>{item.category}</Text>
        <Text style={styles.eventLocation}>
          {item.location?.displayAddress || item.location?.address || "Location not specified"}
        </Text>
        <View style={styles.eventFooter}>
          <Text style={styles.eventDate}>
            {formatDate(item.date)} • {item.time}
          </Text>
          <Text style={styles.eventPrice}>
            {formatPrice(getEventPrice())}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalEvents: 0,
    limit: 5,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [token, setToken] = useState("");

  const getEventPrice = (item) => {
    if (item.isSeated && item.seatingConfig?.sections) {
      // Find the lowest price among all seat types
      const allSeatPrices = item.seatingConfig.sections
        .filter(section => section?.seatTypes)
        .flatMap(section => 
          section.seatTypes
            .filter(type => typeof type.price === 'number')
            .map(type => type.price)
        );
      return allSeatPrices.length > 0 ? Math.min(...allSeatPrices) : 0;
    }
    return item.generalAdmission?.price || item.basePrice || 0;
  };

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const storedToken = await AsyncStorage.getItem("token");
          if (!storedToken) {
            navigation.navigate("Login");
            return;
          }
          setToken(storedToken);
          fetchEvents(storedToken, 1);
        } catch (error) {
          console.error("Error:", error);
          Alert.alert("Error", "Failed to load events");
        }
      };
      fetchData();
    }, [])
  );

  const fetchEvents = async (authToken, pageNum, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
        pageNum = 1;
      } else {
        setLoading(true);
      }

      const response = await axios.get(
        `${API_BASE_URL}/events?page=${pageNum}&limit=${pagination.limit}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const responseData = response.data.data || response.data;
      const eventsData = responseData.events || responseData;

      if (pageNum === 1) {
        setEvents(eventsData);
      } else {
        setEvents((prev) => [...prev, ...eventsData]);
      }

      // Update pagination info
      setPagination({
        page: pageNum,
        totalPages: responseData.pagination?.totalPages || 1,
        totalEvents: responseData.pagination?.totalEvents || eventsData.length,
        limit: pagination.limit,
        hasNextPage: responseData.pagination?.hasNextPage || (eventsData.length === pagination.limit),
        hasPrevPage: responseData.pagination?.hasPrevPage || false
      });
    } catch (error) {
      console.error("Error fetching events:", error);
      if (error.response?.status === 401) {
        handleUnauthorized();
      } else {
        Alert.alert("Error", error.message || "Failed to fetch events");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnauthorized = async () => {
    await AsyncStorage.removeItem("token");
    navigation.navigate("Login");
  };

  const handleRefresh = () => {
    if (token) {
      fetchEvents(token, 1, true);
    }
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasNextPage && token) {
      fetchEvents(token, pagination.page + 1);
    }
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.eventCard, { backgroundColor: theme.background }]}
      onPress={() => navigation.navigate('EventDetails', { eventId: item._id })}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage}
        resizeMode="cover"
      />
      <View style={styles.eventDetails}>
        <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.eventDate, { color: theme.secondaryText }]}>
          {formatDate(item.date)} • {item.time}
        </Text>
        <Text style={[styles.eventLocation, { color: theme.secondaryText }]}>
          {item.location?.displayAddress || item.location?.address}
        </Text>
        <Text style={[styles.eventPrice, { color: theme.primary }]}>
          ₹{getEventPrice(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading || pagination.page === 1) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F76B45" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Upcoming Events</Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No events found</Text>
            <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
              Check back later for new events
            </Text>
          </View>
        }
      />

      {loading && pagination.page === 1 && (
        <View style={[styles.fullScreenLoading, { backgroundColor: theme.background + '99' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#020b73",
    marginVertical: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: "100%",
    height: 180,
  },
  eventInfo: {
    padding: 15,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  eventCategory: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: '600',
    marginBottom: 5,
  },
  eventLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
  },
  eventPrice: {
    fontSize: 16,
    color: "#F76B45",
    fontWeight: "600",
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  refreshButton: {
    backgroundColor: '#F76B45',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  eventDetails: {
    padding: 15,
  },
  fullScreenLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySubText: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
  },
});