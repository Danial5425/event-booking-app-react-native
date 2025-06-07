import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image,
  Keyboard,
  RefreshControl
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config';
import debounce from 'lodash.debounce';
import { useTheme } from '../../context/ThemeContext';

const SearchScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [location, setLocation] = useState('');
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (params) => {
      try {
        setLoading(true);
        
        // Clean up params
        const cleanedParams = {
          ...params,
          page: pagination.page,
          limit: pagination.limit
        };
        
        // Remove empty values
        Object.keys(cleanedParams).forEach(key => {
          if (cleanedParams[key] === undefined || 
              cleanedParams[key] === null || 
              cleanedParams[key] === '') {
            delete cleanedParams[key];
          }
        });

        const response = await axios.get(`${config.API_BASE_URL}/events/search`, {
          params: cleanedParams
        });

        if (response.data.success) {
          setEvents(response.data.data);
          setPagination({
            ...pagination,
            total: response.data.pagination.total,
            pages: response.data.pagination.pages
          });
        }
      } catch (error) {
        console.error('Search error:', error);
        alert('Failed to search events. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, 500),
    [pagination.page, pagination.limit]
  );

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${config.API_BASE_URL}/events/categories`);
        if (response.data.success) {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Initial load and when filters change
  useEffect(() => {
    const params = {
      query: searchQuery,
      category,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
      location
    };
    
    debouncedSearch(params);
  }, [searchQuery, category, dateFrom, dateTo, location, pagination.page]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleLoadMore = () => {
    if (!loading && pagination.page < pagination.pages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setDateFrom(null);
    setDateTo(null);
    setLocation('');
    setPagination(prev => ({ ...prev, page: 1 }));
    Keyboard.dismiss();
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
          {new Date(item.date).toLocaleDateString()} • {item.time}
        </Text>
        <Text style={[styles.eventLocation, { color: theme.secondaryText }]}>
          {item.location?.displayAddress || item.location?.address}
        </Text>
        <Text style={[styles.eventCategory, { color: theme.primary }]}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading || pagination.page === 1) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Search Events</Text>
        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Ionicons 
            name="filter" 
            size={24} 
            color={showFilters ? theme.primary : theme.secondaryText} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search events..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => setPagination(prev => ({ ...prev, page: 1 }))}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={resetFilters}>
            <Ionicons name="close" size={20} color={theme.secondaryText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Picker
            selectedValue={category}
            onValueChange={setCategory}
            style={[styles.picker, { color: theme.text, backgroundColor: theme.background }]}
          >
            <Picker.Item label="All Categories" value="" color={theme.text} />
            {categories.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} color={theme.text} />
            ))}
          </Picker>

          <View style={styles.dateRow}>
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: theme.background }]}
              onPress={() => setShowDateFromPicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {dateFrom ? dateFrom.toLocaleDateString() : 'Start Date'}
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.dateSeparator, { color: theme.secondaryText }]}>to</Text>
            
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: theme.background }]}
              onPress={() => setShowDateToPicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {dateTo ? dateTo.toLocaleDateString() : 'End Date'}
              </Text>
            </TouchableOpacity>
          </View>

          <DatePicker
            modal
            open={showDateFromPicker}
            date={dateFrom || new Date()}
            onConfirm={(date) => {
              setShowDateFromPicker(false);
              setDateFrom(date);
            }}
            onCancel={() => setShowDateFromPicker(false)}
          />

          <DatePicker
            modal
            open={showDateToPicker}
            date={dateTo || new Date()}
            onConfirm={(date) => {
              setShowDateToPicker(false);
              setDateTo(date);
            }}
            onCancel={() => setShowDateToPicker(false)}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Location"
            placeholderTextColor={theme.secondaryText}
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.resetButton, { backgroundColor: theme.border }]}
              onPress={resetFilters}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={renderEventItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              {searchQuery || category || location || dateFrom || dateTo
                ? 'No events match your search criteria'
                : 'No events found. Try adjusting your filters.'}
            </Text>
          </View>
        }
        ListFooterComponent={renderFooter}
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
      />

      {loading && pagination.page === 1 && (
        <View style={[styles.fullScreenLoading, { backgroundColor: theme.background + '99' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filtersPanel: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  dateButtonText: {
    color: '#333',
  },
  dateSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  input: {
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  applyButton: {
    flex: 1,
    marginRight: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  resetButton: {
    flex: 1,
    marginLeft: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eaeaea',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 180,
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  fullScreenLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

export default SearchScreen;