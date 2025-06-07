import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
  FlatList,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import config from '../../../config';
import { useTheme } from "../../../context/ThemeContext";
import { MaterialIcons } from '@expo/vector-icons';

const API_BASE_URL = config.API_BASE_URL;
const CLOUDINARY_UPLOAD_PRESET = "booking";
const CLOUDINARY_CLOUD_NAME = "dozmkz4i8";

const AnimatedInput = ({ label, value, onChangeText, error, onClear, multiline, keyboardType, theme, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const labelStyle = {
    position: 'absolute',
    left: 16,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [15, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.secondaryText, theme.primary],
    }),
    backgroundColor: theme.background,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  return (
    <View style={styles.inputContainer}>
      <Animated.Text style={labelStyle}>
        {label}
      </Animated.Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: isFocused ? theme.primary : theme.border,
            paddingTop: 15,
          },
          error && { borderColor: theme.error },
          multiline && { height: 100, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={!isFocused ? label : ''}
        placeholderTextColor={theme.secondaryText}
      />
      {value && onClear && (
        <TouchableOpacity
          style={styles.clearIcon}
          onPress={onClear}
        >
          <Ionicons name="close-circle" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function EditEvent() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [isInitialized, setIsInitialized] = useState(false);
  const [eventDetails, setEventDetails] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    location: {
      address: '',
      displayAddress: '',
      coordinates: null
    },
    category: '',
    imageUrl: '',
    isSeated: false,
    seatingConfig: {
      sections: [],
      totalSeats: 0
    },
    generalAdmission: {
      capacity: 0,
      price: 0
    }
  });
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [token, setToken] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAddSeatTypeModal, setShowAddSeatTypeModal] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [region, setRegion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [newSeatType, setNewSeatType] = useState({
    name: '',
    price: '',
    quantity: '',
    color: '#FF5733'
  });
  const [categories] = useState([
    'Music',
    'Sports',
    'Arts',
    'Food',
    'Business',
    'Technology',
    'Education',
    'Other'
  ]);
  const [colorOptions] = useState([
    '#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3',
    '#33FFF3', '#FF8333', '#33FF83', '#8333FF', '#FF3383'
  ]);

  const eventId = route?.params?.eventId;
  
  useEffect(() => {
    if (navigation && route) {
      setIsInitialized(true);
    }
  }, [navigation, route]);

  useEffect(() => {
    const fetchEventAndToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const response = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          const event = response.data;
          setEventDetails({
            title: event.title,
            description: event.description,
            date: new Date(event.date),
            time: event.time,
            location: event.location,
            category: event.category,
            imageUrl: event.imageUrl,
            isSeated: event.isSeated,
            seatingConfig: event.isSeated ? event.seatingConfig : {
              sections: [],
              totalSeats: 0
            },
            generalAdmission: !event.isSeated ? event.generalAdmission : {
              capacity: 0,
              price: 0
            }
          });

          setImage(event.imageUrl);

          if (event.location.coordinates) {
            setRegion({
              latitude: event.location.coordinates.lat,
              longitude: event.location.coordinates.lng,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            setSelectedLocation({
              latitude: event.location.coordinates.lat,
              longitude: event.location.coordinates.lng
            });
          }
        }
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'Failed to load event details');
      }
    };
    
    if (eventId) {
      fetchEventAndToken();
    }
  }, [eventId]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={styles.container}>
        <Text>Error: Event ID not provided</Text>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.submitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || eventDetails.date;
    setShowDatePicker(Platform.OS === 'ios');
    setEventDetails({...eventDetails, date: currentDate});
  };

  const handleTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || new Date();
    setShowTimePicker(Platform.OS === 'ios');
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    setEventDetails({...eventDetails, time: formattedTime});
  };

  const handleLocationSelect = (e) => {
    const { coordinate } = e.nativeEvent;
    setSelectedLocation(coordinate);
    setRegion(prev => ({
      ...prev,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude
    }));

    setEventDetails(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          lat: coordinate.latitude,
          lng: coordinate.longitude
        }
      }
    }));
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsFetchingLocation(true);
      const encodedAddress = encodeURIComponent(searchQuery);
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=5`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'EventBookingApp'
          }
        }
      );

      if (response.data && response.data.length > 0) {
        const results = response.data.map(item => ({
          place_id: item.place_id,
          name: item.display_name.split(',')[0],
          formatted_address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon)
        }));

        setSearchResults(results);
        const firstResult = results[0];
        setRegion({
          latitude: firstResult.latitude,
          longitude: firstResult.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('Location search error:', error);
      Alert.alert('Error', 'Failed to search locations');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSeatTypeChange = (sectionIndex, seatTypeIndex, field, value) => {
    const updatedSections = [...eventDetails.seatingConfig.sections];
    updatedSections[sectionIndex].seatTypes[seatTypeIndex][field] = 
      field === 'price' || field === 'quantity' ? Number(value) : value;
    
    setEventDetails(prev => ({
      ...prev,
      seatingConfig: {
        ...prev.seatingConfig,
        sections: updatedSections,
        totalSeats: updatedSections.reduce(
          (sum, section) => sum + section.seatTypes.reduce(
            (sectionSum, type) => sectionSum + (type.quantity || 0), 0
          ), 0
        )
      }
    }));
  };

  const addSeatType = () => {
    if (!newSeatType.name || !newSeatType.price || !newSeatType.quantity) {
      Alert.alert('Error', 'Please fill all fields for the new seat type');
      return;
    }

    const updatedSections = [...eventDetails.seatingConfig.sections];
    if (updatedSections.length === 0) {
      // Add a default section if none exists
      updatedSections.push({
        name: 'Main Section',
        seatTypes: [],
        totalSeats: 0,
        color: '#4F46E5'
      });
    }

    // Add the new seat type to the first section
    updatedSections[0].seatTypes.push({
      name: newSeatType.name,
      price: Number(newSeatType.price),
      quantity: Number(newSeatType.quantity),
      color: newSeatType.color
    });

    setEventDetails(prev => ({
      ...prev,
      seatingConfig: {
        ...prev.seatingConfig,
        sections: updatedSections,
        totalSeats: updatedSections.reduce(
          (sum, section) => sum + section.seatTypes.reduce(
            (sectionSum, type) => sectionSum + (type.quantity || 0), 0
          ), 0
        )
      }
    }));

    setNewSeatType({
      name: '',
      price: '',
      quantity: '',
      color: '#FF5733'
    });
    setShowAddSeatTypeModal(false);
  };

  const removeSeatType = (sectionIndex, seatTypeIndex) => {
    const updatedSections = [...eventDetails.seatingConfig.sections];
    updatedSections[sectionIndex].seatTypes.splice(seatTypeIndex, 1);
    
    setEventDetails(prev => ({
      ...prev,
      seatingConfig: {
        ...prev.seatingConfig,
        sections: updatedSections,
        totalSeats: updatedSections.reduce(
          (sum, section) => sum + section.seatTypes.reduce(
            (sectionSum, type) => sectionSum + (type.quantity || 0), 0
          ), 0
        )
      }
    }));
  };

  const handleGeneralAdmissionChange = (field, value) => {
    setEventDetails(prev => ({
      ...prev,
      generalAdmission: {
        ...prev.generalAdmission,
        [field]: field === 'price' || field === 'capacity' ? Number(value) : value
      }
    }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to upload images');
        return;
      }

      Alert.alert(
        'Select Image Source',
        'Choose where to get the image from',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus !== 'granted') {
                Alert.alert('Permission required', 'We need access to your camera to take photos');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
                allowsMultipleSelection: false,
              });

              if (!result.canceled) {
                setImage(result.assets[0].uri);
                setEventDetails(prev => ({
                  ...prev,
                  imageUrl: result.assets[0].uri
                }));
              }
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
                allowsMultipleSelection: false,
              });

              if (!result.canceled) {
                setImage(result.assets[0].uri);
                setEventDetails(prev => ({
                  ...prev,
                  imageUrl: result.assets[0].uri
                }));
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    setUploadingImage(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'event-image.jpg',
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = await response.json();
      
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error('Failed to get secure URL from Cloudinary');
      }
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to update an event');
      navigation.navigate('Login');
      return;
    }

    // Validate required fields
    if (!eventDetails.title || !eventDetails.description || !eventDetails.date || 
        !eventDetails.time || !eventDetails.location.address || !eventDetails.category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (eventDetails.isSeated && eventDetails.seatingConfig.totalSeats === 0) {
      Alert.alert('Error', 'Please add at least one seat type with quantity');
      return;
    }

    if (!eventDetails.isSeated && eventDetails.generalAdmission.capacity === 0) {
      Alert.alert('Error', 'Please enter capacity for general admission');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = eventDetails.imageUrl;
      
      // Upload new image if changed
      if (image && image !== eventDetails.imageUrl) {
        const uploadedUrl = await uploadImageToCloudinary(image);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      // Prepare the event data
      const updatedEvent = {
        title: eventDetails.title,
        description: eventDetails.description,
        date: eventDetails.date.toISOString(),
        time: eventDetails.time,
        location: eventDetails.location,
        category: eventDetails.category,
        imageUrl,
        isSeated: eventDetails.isSeated,
        seatingConfig: eventDetails.isSeated ? eventDetails.seatingConfig : null,
        generalAdmission: !eventDetails.isSeated ? eventDetails.generalAdmission : null
      };

      const response = await axios.put(
        `${API_BASE_URL}/events/${eventId}`,
        updatedEvent,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        Alert.alert('Success', 'Event updated successfully!');
        navigation.goBack();
      } else {
        throw new Error('Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      let errorMessage = 'Failed to update event';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          await AsyncStorage.removeItem('token');
          navigation.navigate('Login');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setEventDetails(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.background }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={29} color={theme.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
          <Text style={[styles.header, { color: theme.text }]}>Edit Event</Text>
          
          {/* Basic Event Information */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Event Information</Text>
            
            <AnimatedInput
              label="Event Title *"
              value={eventDetails.title}
              onChangeText={(text) => handleChange('title', text)}
              theme={theme}
              onClear={() => handleChange('title', '')}
            />

            <AnimatedInput
              label="Event Description *"
              value={eventDetails.description}
              onChangeText={(text) => handleChange('description', text)}
              theme={theme}
              multiline
              onClear={() => handleChange('description', '')}
            />

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeInput}>
                <Text style={[styles.label, { color: theme.text }]}>Date *</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateTimeText, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={{ color: theme.text }}>
                    {eventDetails.date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateTimeInput}>
                <Text style={[styles.label, { color: theme.text }]}>Time *</Text>
                <TouchableOpacity 
                  onPress={() => setShowTimePicker(true)}
                  style={[styles.dateTimeText, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={{ color: theme.text }}>{eventDetails.time}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <AnimatedInput
              label="Location Address *"
              value={eventDetails.location.address}
              onChangeText={(text) => handleChange('location', { 
                ...eventDetails.location, 
                address: text,
                displayAddress: text 
              })}
              theme={theme}
              onClear={() => handleChange('location', { 
                ...eventDetails.location, 
                address: '',
                displayAddress: '' 
              })}
            />

            <View style={[styles.pickerContainer, { backgroundColor: theme.background }]}>
              <Text style={{ color: theme.text }}>Category *</Text>
              <Picker
                selectedValue={eventDetails.category}
                onValueChange={(value) => handleChange('category', value)}
                style={[styles.picker, { color: theme.text }]}
                dropdownIconColor={theme.text}
              >
                {categories.map((category, index) => (
                  <Picker.Item 
                    key={index} 
                    label={category} 
                    value={category}
                    color={theme.text}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Event Type Section */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Event Type</Text>
            <View style={styles.switchContainer}>
              <Text style={{ color: theme.text }}>Seated Event:</Text>
              <Switch
                value={eventDetails.isSeated}
                onValueChange={(value) => handleChange('isSeated', value)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={eventDetails.isSeated ? theme.primary : theme.secondaryText}
              />
            </View>
          </View>

          {/* Conditional rendering based on event type */}
          {eventDetails.isSeated ? (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Seating Configuration</Text>
              
              {eventDetails.seatingConfig.sections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={[styles.sectionItem, { backgroundColor: theme.background }]}>
                  <Text style={[styles.sectionItemTitle, { color: theme.text }]}>{section.name}</Text>
                  
                  {section.seatTypes.map((seatType, seatTypeIndex) => (
                    <View key={seatTypeIndex} style={[styles.seatTypeItem, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.seatTypeInfo}>
                        <AnimatedInput
                          label="Seat Type Name"
                          value={seatType.name}
                          onChangeText={(text) => 
                            handleSeatTypeChange(sectionIndex, seatTypeIndex, 'name', text)
                          }
                          theme={theme}
                          style={styles.smallInput}
                        />
                        
                        <View style={styles.row}>
                          <AnimatedInput
                            label="Price (₹)"
                            value={seatType.price.toString()}
                            onChangeText={(text) => 
                              handleSeatTypeChange(sectionIndex, seatTypeIndex, 'price', text)
                            }
                            keyboardType="numeric"
                            theme={theme}
                            style={styles.smallInput}
                          />
                          
                          <AnimatedInput
                            label="Quantity"
                            value={seatType.quantity.toString()}
                            onChangeText={(text) => 
                              handleSeatTypeChange(sectionIndex, seatTypeIndex, 'quantity', text)
                            }
                            keyboardType="numeric"
                            theme={theme}
                            style={styles.smallInput}
                          />
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => removeSeatType(sectionIndex, seatTypeIndex)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={24} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
              
              <TouchableOpacity
                style={[styles.addButton, { borderColor: theme.primary }]}
                onPress={() => setShowAddSeatTypeModal(true)}
              >
                <Text style={[styles.addButtonText, { color: theme.primary }]}>Add New Seat Type</Text>
                <Ionicons name="add-circle" size={24} color={theme.primary} />
              </TouchableOpacity>
              
              <Text style={[styles.totalSeatsText, { color: theme.primary }]}>
                Total Seats: {eventDetails.seatingConfig.totalSeats}
              </Text>
            </View>
          ) : (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>General Admission Configuration</Text>
              
              <AnimatedInput
                label="Total Capacity *"
                value={eventDetails.generalAdmission.capacity.toString()}
                onChangeText={(text) => handleGeneralAdmissionChange('capacity', text)}
                keyboardType="numeric"
                theme={theme}
              />
              
              <AnimatedInput
                label="Price (₹) *"
                value={eventDetails.generalAdmission.price.toString()}
                onChangeText={(text) => handleGeneralAdmissionChange('price', text)}
                keyboardType="numeric"
                theme={theme}
              />
            </View>
          )}

          {/* Event Image */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Event Image</Text>
            <View style={styles.imageContainer}>
              {uploadingImage ? (
                <View style={[styles.uploadButton, { borderColor: theme.primary }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Uploading Image...</Text>
                </View>
              ) : image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: image }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={[styles.removeImageButton, { backgroundColor: theme.error }]}
                    onPress={() => {
                      setImage(null);
                      setEventDetails(prev => ({
                        ...prev,
                        imageUrl: ''
                      }));
                    }}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.uploadButton, { borderColor: theme.primary }]} 
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={32} color={theme.primary} />
                  <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload Image</Text>
                  <Text style={[styles.uploadButtonSubtext, { color: theme.secondaryText }]}>
                    Tap to select from camera or gallery
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: theme.primary }]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Update Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Seat Type Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddSeatTypeModal}
        onRequestClose={() => setShowAddSeatTypeModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Seat Type</Text>
            
            <AnimatedInput
              label="Seat Type Name *"
              value={newSeatType.name}
              onChangeText={(text) => setNewSeatType({...newSeatType, name: text})}
              theme={theme}
            />
            
            <AnimatedInput
              label="Price (₹) *"
              value={newSeatType.price}
              onChangeText={(text) => setNewSeatType({...newSeatType, price: text})}
              keyboardType="numeric"
              theme={theme}
            />
            
            <AnimatedInput
              label="Quantity *"
              value={newSeatType.quantity}
              onChangeText={(text) => setNewSeatType({...newSeatType, quantity: text})}
              keyboardType="numeric"
              theme={theme}
            />
            
            <Text style={[styles.colorPickerTitle, { color: theme.text }]}>Select Color:</Text>
            <View style={styles.colorOptionsContainer}>
              {colorOptions.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newSeatType.color === color && styles.selectedColorOption
                  ]}
                  onPress={() => setNewSeatType({...newSeatType, color})}
                />
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => setShowAddSeatTypeModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.addButtonModal, { backgroundColor: theme.primary }]}
                onPress={addSeatType}
              >
                <Text style={styles.addButtonText}>Add Seat Type</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  smallInput: {
    padding: 10,
    marginBottom: 0,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeInput: {
    width: '48%',
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  dateTimeText: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  picker: {
    width: '100%',
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionItem: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  seatTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  seatTypeInfo: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteButton: {
    padding: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  addButtonText: {
    marginRight: 10,
    fontWeight: '600',
  },
  totalSeatsText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  uploadButton: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    marginBottom: 15,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorPickerTitle: {
    marginBottom: 10,
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  addButtonModal: {
    backgroundColor: '#4F46E5',
  },
  cancelButtonText: {
    color: '#333',
  },
  addButtonText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});