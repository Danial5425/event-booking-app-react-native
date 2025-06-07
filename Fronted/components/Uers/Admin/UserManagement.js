import React, { useState, useEffect } from 'react';
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
  RefreshControl,
  TextInput,
  ScrollView,
  SafeAreaView,
  Linking
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../context/ThemeContext';

export default function UserManagement() {
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: '',
    gender: '',
    address: '',
    bio: '',
    age: '',
    interests: []
  });

  const fetchUsers = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${config.API_BASE_URL}/auth/all-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.status) {
        setUsers(response.data.users);
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      role: user.role,
      gender: user.gender || '',
      address: user.address || '',
      bio: user.bio || '',
      age: user.age || '',
      interests: user.interests || []
    });
    setEditModalVisible(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.delete(
        `${config.API_BASE_URL}/auth/delete-user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.status) {
        Alert.alert('Success', 'User deleted successfully');
        fetchUsers();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleUpdateUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${config.API_BASE_URL}/auth/update-user/${selectedUser._id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.status) {
        Alert.alert('Success', 'User updated successfully');
        setEditModalVisible(false);
        fetchUsers();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailPress = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.mobile && user.mobile.includes(searchQuery))
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userCard, { backgroundColor: theme.background }]}
      onPress={() => handleViewUser(item)}
    >
      <View style={styles.userInfo}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: theme.border }]}>
            <Icon name="person" size={24} color={theme.secondaryText} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleEmailPress(item.email)}>
            <Text style={[styles.userEmail, styles.linkText, { color: theme.primary }]}>{item.email}</Text>
          </TouchableOpacity>
          {item.mobile && (
            <TouchableOpacity onPress={() => handlePhonePress(item.mobile)}>
              <Text style={[styles.userMobile, styles.linkText, { color: theme.primary }]}>{item.mobile}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.userRole, { color: theme.secondaryText }]}>
            Role: <Text style={styles[item.role]}>{item.role}</Text>
          </Text>
        </View>
      </View>
      <View style={[styles.actionButtons, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditUser(item)}
        >
          <Icon name="edit" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Confirm Delete',
              `Are you sure you want to delete ${item.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => handleDeleteUser(item._id) }
              ]
            );
          }}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.primary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>User Management</Text>
      
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Icon name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search users..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No users found</Text>
          </View>
        }
      />

      {/* User Details Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>User Details</Text>
            <View style={{ width: 24 }} />
          </View>
            
          {selectedUser && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.userProfile}>
                {selectedUser.profileImage ? (
                  <Image 
                    source={{ uri: selectedUser.profileImage }} 
                    style={styles.modalProfileImage} 
                  />
                ) : (
                  <View style={[styles.modalProfilePlaceholder, { backgroundColor: theme.border }]}>
                    <Icon name="person" size={48} color={theme.secondaryText} />
                  </View>
                )}
                <Text style={[styles.modalUserName, { color: theme.text }]}>{selectedUser.name || 'No Name'}</Text>
                <Text style={[styles.modalUserRole, { color: theme.secondaryText }]}>
                  Role: <Text style={styles[selectedUser.role]}>{selectedUser.role || 'No Role'}</Text>
                </Text>
                
                {/* Action Buttons */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.editButton]}
                    onPress={() => {
                      setModalVisible(false);
                      handleEditUser(selectedUser);
                    }}
                  >
                    <Icon name="edit" size={20} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Edit User</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.deleteButton]}
                    onPress={() => {
                      setModalVisible(false);
                      Alert.alert(
                        'Confirm Delete',
                        `Are you sure you want to delete ${selectedUser.name || 'this user'}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', onPress: () => handleDeleteUser(selectedUser._id) }
                        ]
                      );
                    }}
                  >
                    <Icon name="delete" size={20} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Delete User</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Information</Text>
                <View style={styles.detailRow}>
                  <Icon name="email" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>{selectedUser.email || 'Not provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="phone" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>{selectedUser.mobile || 'Not provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="person" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>{selectedUser.gender || 'Not specified'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="cake" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>
                    {selectedUser.age ? `${selectedUser.age} years` : 'Age not specified'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Additional Information</Text>
                <View style={styles.detailRow}>
                  <Icon name="home" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>{selectedUser.address || 'Not provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="info" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>{selectedUser.bio || 'No bio provided'}</Text>
                </View>
              </View>

              {selectedUser.interests?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Interests</Text>
                  <View style={styles.interestsContainer}>
                    {selectedUser.interests.map((interest, index) => (
                      <View key={index} style={[styles.interestTag, { backgroundColor: theme.border }]}>
                        <Text style={[styles.interestText, { color: theme.text }]}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Information</Text>
                <View style={styles.detailRow}>
                  <Icon name="calendar-today" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>
                    Joined: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Not available'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="update" size={20} color={theme.secondaryText} />
                  <Text style={[styles.detailText, { color: theme.secondaryText }]}>
                    Last updated: {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleDateString() : 'Not available'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit User</Text>
            <View style={{ width: 24 }} />
          </View>
            
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput, { 
                  backgroundColor: theme.border,
                  color: theme.secondaryText,
                  borderColor: theme.border
                }]}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                editable={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Mobile</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.mobile}
                onChangeText={(text) => handleInputChange('mobile', text)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: theme.background,
                      borderColor: theme.border
                    },
                    formData.role === 'admin' && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => handleInputChange('role', 'admin')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: theme.text },
                    formData.role === 'admin' && styles.roleButtonTextActive
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: theme.background,
                      borderColor: theme.border
                    },
                    formData.role === 'organizer' && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => handleInputChange('role', 'organizer')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: theme.text },
                    formData.role === 'organizer' && styles.roleButtonTextActive
                  ]}>
                    Organizer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: theme.background,
                      borderColor: theme.border
                    },
                    formData.role === 'customer' && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => handleInputChange('role', 'customer')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: theme.text },
                    formData.role === 'customer' && styles.roleButtonTextActive
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('gender', 'Male')}
                >
                  <View style={[styles.radioCircle, { borderColor: theme.secondaryText }]}>
                    {formData.gender === 'Male' && <View style={[styles.selectedRb, { backgroundColor: theme.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('gender', 'Female')}
                >
                  <View style={[styles.radioCircle, { borderColor: theme.secondaryText }]}>
                    {formData.gender === 'Female' && <View style={[styles.selectedRb, { backgroundColor: theme.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('gender', 'Other')}
                >
                  <View style={[styles.radioCircle, { borderColor: theme.secondaryText }]}>
                    {formData.gender === 'Other' && <View style={[styles.selectedRb, { backgroundColor: theme.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Other</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Age</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.age.toString()}
                onChangeText={(text) => handleInputChange('age', text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.bio}
                onChangeText={(text) => handleInputChange('bio', text)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Interests (comma separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={formData.interests.join(', ')}
                onChangeText={(text) => handleInputChange('interests', text.split(',').map(item => item.trim()))}
                multiline
                numberOfLines={2}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleUpdateUser}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userMobile: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  admin: {
    color: '#F76B45',
    fontWeight: 'bold',
  },
  organizer: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  customer: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  editButton: {
    backgroundColor: '#FFC107',
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#F76B45',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
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
  modalBody: {
    flex: 1,
  },
  userProfile: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  modalProfilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalUserRole: {
    fontSize: 16,
    color: '#666',
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flexShrink: 1,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  interestTag: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#333',
  },
  formGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleButtonActive: {
    backgroundColor: '#F76B45',
    borderColor: '#F76B45',
  },
  roleButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F76B45',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#F76B45',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    gap: 8,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
});