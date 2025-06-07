import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import config from "../../config";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = config.API_BASE_URL;
const CLOUDINARY_UPLOAD_PRESET = "booking";
const CLOUDINARY_CLOUD_NAME = "dozmkz4i8";
const DEFAULT_PROFILE_IMAGE = require("../../assets/Default_pfp.jpg");

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [user, setUser] = useState({
    name: "",
    email: "",
    mobile: "",
    address: "",
    profileImage: "",
  });
  // console.log(user);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchUserProfile();
      } catch (error) {
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchUserProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.navigate("Login");
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user);
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (err.response?.status === 401) {
        await AsyncStorage.removeItem("token");
        navigation.navigate("Login");
      }
      throw err;
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "profile.jpg",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          transformRequest: () => formData,
        }
      );

      return response.data.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      Alert.alert("Error", "Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photos to upload images"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, // Slightly reduced quality for faster uploads
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const cloudinaryUrl = await uploadImageToCloudinary(result.assets[0].uri);
      if (cloudinaryUrl) {
        await updateProfileImage(cloudinaryUrl);
      }
    }
  };

  const updateProfileImage = async (imageUrl) => {
    const token = await AsyncStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/auth/profile`,
        { profileImage: imageUrl },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser((prev) => ({ ...prev, profileImage: imageUrl }));
      Alert.alert("Success", "Profile image updated!");
    } catch (err) {
      console.error("Error updating profile image:", err);
      Alert.alert("Error", "Failed to update profile image");
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    const token = await AsyncStorage.getItem("token");

    try {
      await axios.put(`${API_BASE_URL}/auth/profile`, user, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.background }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={29} color={theme.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
              <Image
                source={
                  user.profileImage
                    ? { uri: user.profileImage }
                    : DEFAULT_PROFILE_IMAGE
                }
                style={[styles.profileImage, { borderColor: theme.border }]}
                defaultSource={DEFAULT_PROFILE_IMAGE}
              />
              <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" size={20} color="white" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={user.name}
            onChangeText={(text) => handleInputChange("name", text)}
            placeholder="Enter your name"
            placeholderTextColor={theme.secondaryText}
          />

          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput
            style={[styles.input, styles.disabledInput, { 
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.secondaryText
            }]}
            value={user.email}
            editable={false}
          />

          <Text style={[styles.label, { color: theme.text }]}>Mobile Number</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={user.mobile}
            onChangeText={(text) => handleInputChange("mobile", text)}
            placeholder="Enter mobile number"
            placeholderTextColor={theme.secondaryText}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.text }]}>Age</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={user.age}
            onChangeText={(text) => handleInputChange("age", text)}
            placeholder="Enter age"
            placeholderTextColor={theme.secondaryText}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.text }]}>Role</Text>
          <View style={[styles.dropdown, { 
            backgroundColor: theme.background,
            borderColor: theme.border
          }]}>
            <Picker
              selectedValue={user.role}
              onValueChange={(itemValue) => handleInputChange("role", itemValue)}
              mode="dropdown"
              dropdownIconColor={theme.text}
              style={{ color: theme.text }}
            >
              <Picker.Item label="Select a role" value="" color={theme.text} />
              <Picker.Item label="Customer" value="customer" color={theme.text} />
              <Picker.Item label="Organizer" value="organizer" color={theme.text} />
            </Picker>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
          <View style={[styles.dropdown, { 
            backgroundColor: theme.background,
            borderColor: theme.border
          }]}>
            <Picker
              selectedValue={user.gender}
              onValueChange={(itemValue) => handleInputChange("gender", itemValue)}
              mode="dropdown"
              dropdownIconColor={theme.text}
              style={{ color: theme.text }}
            >
              <Picker.Item label="Select a Gender" value="" color={theme.text} />
              <Picker.Item label="Male" value="Male" color={theme.text} />
              <Picker.Item label="Female" value="Female" color={theme.text} />
              <Picker.Item label="Transgender" value="Transgender" color={theme.text} />
            </Picker>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Address</Text>
          <TextInput
            style={[styles.input, { 
              height: 80,
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={user.address}
            onChangeText={(text) => handleInputChange("address", text)}
            placeholder="Enter your address"
            placeholderTextColor={theme.secondaryText}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  outerContainer: {
    flex: 1,
    position: 'relative',
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    borderRadius: 15,
    padding: 5,
  },
  label: {
    marginTop: 15,
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  disabledInput: {
    opacity: 0.7,
  },
  button: {
    padding: 15,
    marginTop: 30,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
});

export default EditProfileScreen;
