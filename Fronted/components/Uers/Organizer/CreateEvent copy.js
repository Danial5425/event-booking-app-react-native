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
  FlatList,
  Modal,
  Pressable
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import config from '../../../config';

const API_BASE_URL = config.API_BASE_URL;
const CLOUDINARY_UPLOAD_PRESET = "CreateEvent";
const CLOUDINARY_CLOUD_NAME = "dozmkz4i8";
const GOOGLE_MAPS_API_KEY = config.GOOGLE_MAPS_API_KEY;

export default function CreateEvent() {
  const navigation = useNavigation();
  const [eventDetails, setEventDetails] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    location: {
      address: '',
      coordinates: null
    },
    category: '',
    basePrice: '',
    totalCapacity: '',
  });
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [token, setToken] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [sections, setSections] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newSection, setNewSection] = useState({
    name: '',
    capacity: '',
    priceMultiplier: '1',
    isPriority: false
  });
  const [newTicket, setNewTicket] = useState({
    name: '',
    description: '',
    price: '',
    benefits: '',
    quantityAvailable: ''
  });
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapModalVisible, setMapModalVisible] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
        } else {
          navigation.navigate('Login');
        }
      } catch (error) {
        console.error('Error getting token:', error);
        Alert.alert('Error', 'Failed to authenticate');
      }
    };
    getToken();
    
    // Get current location for map
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to upload images');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'event-image.jpg',
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: () => formData,
        }
      );
      return response.data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || eventDetails.date;
    setShowDatePicker(Platform.OS === 'ios');
    setEventDetails({...eventDetails, date: currentDate});
  };

  const handleTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || new Date();
    setShowTimePicker(Platform.OS === 'ios');
    
    // Format time as HH:MM
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    setEventDetails({...eventDetails, time: formattedTime});
  };

  const handleLocationSelect = (e) => {
    const { coordinate } = e.nativeEvent;
    setEventDetails({
      ...eventDetails,
      location: {
        ...eventDetails.location,
        coordinates: {
          lat: coordinate.latitude,
          lng: coordinate.longitude
        }
      }
    });
  };

  const addSection = () => {
    if (!newSection.name || !newSection.capacity) {
      Alert.alert('Error', 'Section name and capacity are required');
      return;
    }
    
    const section = {
      name: newSection.name,
      capacity: parseInt(newSection.capacity),
      priceMultiplier: parseFloat(newSection.priceMultiplier),
      isPriority: newSection.isPriority,
      rows: []
    };
    
    setSections([...sections, section]);
    setNewSection({
      name: '',
      capacity: '',
      priceMultiplier: '1',
      isPriority: false
    });
    setShowSectionModal(false);
  };

  const addTicketType = () => {
    if (!newTicket.name || !newTicket.price || !newTicket.quantityAvailable) {
      Alert.alert('Error', 'Name, price and quantity are required');
      return;
    }
    
    const ticket = {
      name: newTicket.name,
      description: newTicket.description,
      price: parseFloat(newTicket.price),
      benefits: newTicket.benefits.split(',').map(b => b.trim()),
      quantityAvailable: parseInt(newTicket.quantityAvailable)
    };
    
    setTicketTypes([...ticketTypes, ticket]);
    setNewTicket({
      name: '',
      description: '',
      price: '',
      benefits: '',
      quantityAvailable: ''
    });
    setShowTicketModal(false);
  };

  const removeSection = (index) => {
    const updatedSections = [...sections];
    updatedSections.splice(index, 1);
    setSections(updatedSections);
  };

  const removeTicketType = (index) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets.splice(index, 1);
    setTicketTypes(updatedTickets);
  };

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image for the event');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'You must be logged in to create an event');
      navigation.navigate('Login');
      return;
    }

    // Validate required fields
    if (!eventDetails.title || !eventDetails.description || !eventDetails.date || 
        !eventDetails.time || !eventDetails.location.address || !eventDetails.category || 
        !eventDetails.basePrice || !eventDetails.totalCapacity) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const imageUrl = await uploadImageToCloudinary(image);
      if (!imageUrl) return;

      // Prepare seating configuration
      const seatingConfig = {
        totalCapacity: parseInt(eventDetails.totalCapacity),
        sections: sections
      };

      const response = await axios.post(
        `${API_BASE_URL}/events/Create-Event`,
        { 
          ...eventDetails,
          imageUrl,
          seatingConfig,
          ticketTypes,
          date: eventDetails.date.toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert('Success', 'Event created successfully!');
      // Reset form
      setEventDetails({
        title: '',
        description: '',
        date: new Date(),
        time: '',
        location: {
          address: '',
          coordinates: null
        },
        category: '',
        basePrice: '',
        totalCapacity: '',
      });
      setImage(null);
      setSections([]);
      setTicketTypes([]);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating event:', error);
      let errorMessage = 'Failed to create event';
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

  const handleLocationChange = (name, value) => {
    setEventDetails(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={29} color="#F76B45" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Create New Event</Text>
          
          <TextInput
            placeholder="Event Title *"
            value={eventDetails.title}
            onChangeText={(text) => handleChange('title', text)}
            style={styles.input}
          />
          
          <TextInput
            placeholder="Description *"
            value={eventDetails.description}
            onChangeText={(text) => handleChange('description', text)}
            multiline
            style={[styles.input, styles.multilineInput]}
          />
          
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.input, styles.halfInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>
                {eventDetails.date ? eventDetails.date.toDateString() : 'Select Date *'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.input, styles.halfInput]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text>
                {eventDetails.time || 'Select Time *'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={eventDetails.date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          
          {showTimePicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
          
          <TextInput
            placeholder="Location Address *"
            value={eventDetails.location.address}
            onChangeText={(text) => handleLocationChange('address', text)}
            style={styles.input}
          />
          
          <TouchableOpacity 
            style={styles.input}
            onPress={() => setMapModalVisible(true)}
          >
            <Text>Select Location on Map *</Text>
            {eventDetails.location.coordinates && (
              <Text style={styles.smallText}>
                Selected: {eventDetails.location.coordinates.lat.toFixed(4)}, 
                {eventDetails.location.coordinates.lng.toFixed(4)}
              </Text>
            )}
          </TouchableOpacity>
          
          <Modal
            animationType="slide"
            transparent={false}
            visible={mapModalVisible}
            onRequestClose={() => setMapModalVisible(false)}
          >
            <View style={{ flex: 1 }}>
              <MapView
                style={{ flex: 1 }}
                region={region}
                onPress={handleLocationSelect}
              >
                {eventDetails.location.coordinates && (
                  <Marker
                    coordinate={{
                      latitude: eventDetails.location.coordinates.lat,
                      longitude: eventDetails.location.coordinates.lng
                    }}
                  />
                )}
              </MapView>
              <TouchableOpacity
                style={styles.mapDoneButton}
                onPress={() => setMapModalVisible(false)}
              >
                <Text style={styles.mapDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          
          <TextInput
            placeholder="Category *"
            value={eventDetails.category}
            onChangeText={(text) => handleChange('category', text)}
            style={styles.input}
          />
          
          <TextInput
            placeholder="Base Price *"
            value={eventDetails.basePrice}
            onChangeText={(text) => handleChange('basePrice', text)}
            keyboardType="numeric"
            style={styles.input}
          />
          
          <TextInput
            placeholder="Total Capacity *"
            value={eventDetails.totalCapacity}
            onChangeText={(text) => handleChange('totalCapacity', text)}
            keyboardType="numeric"
            style={styles.input}
          />
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Seating Sections</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowSectionModal(true)}
            >
              <Ionicons name="add" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          
          {sections.length > 0 ? (
            <FlatList
              data={sections}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.sectionItem}>
                  <View>
                    <Text>{item.name} (Capacity: {item.capacity})</Text>
                    <Text>Price Multiplier: {item.priceMultiplier}x</Text>
                    <Text>{item.isPriority ? 'Priority Section' : 'Standard Section'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSection(index)}>
                    <Ionicons name="trash" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              )}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noItemsText}>No sections added yet</Text>
          )}
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ticket Types</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowTicketModal(true)}
            >
              <Ionicons name="add" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          
          {ticketTypes.length > 0 ? (
            <FlatList
              data={ticketTypes}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.sectionItem}>
                  <View>
                    <Text>{item.name} (${item.price})</Text>
                    <Text>Available: {item.quantityAvailable}</Text>
                    {item.description && <Text>{item.description}</Text>}
                    {item.benefits.length > 0 && (
                      <Text>Benefits: {item.benefits.join(', ')}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeTicketType(index)}>
                    <Ionicons name="trash" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              )}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noItemsText}>No ticket types added yet</Text>
          )}
          
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.imagePicker}
            disabled={uploadingImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <Text style={styles.imagePickerText}>Select Event Image *</Text>
            )}
            {uploadingImage && (
              <View style={styles.uploadIndicator}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={styles.submitButton}
            disabled={isLoading || uploadingImage}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Add Section Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSectionModal}
        onRequestClose={() => setShowSectionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Seating Section</Text>
            
            <TextInput
              placeholder="Section Name *"
              value={newSection.name}
              onChangeText={(text) => setNewSection({...newSection, name: text})}
              style={styles.input}
            />
            
            <TextInput
              placeholder="Capacity *"
              value={newSection.capacity}
              onChangeText={(text) => setNewSection({...newSection, capacity: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <TextInput
              placeholder="Price Multiplier (e.g., 1.5)"
              value={newSection.priceMultiplier}
              onChangeText={(text) => setNewSection({...newSection, priceMultiplier: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <View style={styles.switchContainer}>
              <Text>Priority Section:</Text>
              <Switch
                value={newSection.isPriority}
                onValueChange={(value) => setNewSection({...newSection, isPriority: value})}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSectionModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={addSection}
              >
                <Text style={styles.modalButtonText}>Add Section</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Ticket Type Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTicketModal}
        onRequestClose={() => setShowTicketModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Ticket Type</Text>
            
            <TextInput
              placeholder="Ticket Name *"
              value={newTicket.name}
              onChangeText={(text) => setNewTicket({...newTicket, name: text})}
              style={styles.input}
            />
            
            <TextInput
              placeholder="Description"
              value={newTicket.description}
              onChangeText={(text) => setNewTicket({...newTicket, description: text})}
              style={styles.input}
            />
            
            <TextInput
              placeholder="Price *"
              value={newTicket.price}
              onChangeText={(text) => setNewTicket({...newTicket, price: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <TextInput
              placeholder="Benefits (comma separated)"
              value={newTicket.benefits}
              onChangeText={(text) => setNewTicket({...newTicket, benefits: text})}
              style={styles.input}
            />
            
            <TextInput
              placeholder="Quantity Available *"
              value={newTicket.quantityAvailable}
              onChangeText={(text) => setNewTicket({...newTicket, quantityAvailable: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTicketModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={addTicketType}
              >
                <Text style={styles.modalButtonText}>Add Ticket</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
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
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    width: '100%',
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  halfInput: {
    width: '48%',
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 4/3,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePickerText: {
    color: '#666',
    fontSize: 16,
  },
  uploadIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  noItemsText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  addButtonModal: {
    backgroundColor: '#4F46E5',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  smallText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  mapDoneButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
  },
  mapDoneButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});