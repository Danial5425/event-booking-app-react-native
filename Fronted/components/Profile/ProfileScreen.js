import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import ImagePickerModal from "./ImagePickerModal";
import axios from "axios";
import config from "../../config";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = config.API_BASE_URL;
const CLOUDINARY_UPLOAD_PRESET = "booking";
const CLOUDINARY_CLOUD_NAME = "dozmkz4i8";
const DEFAULT_PROFILE_IMAGE = require("../../assets/Default_pfp.jpg");

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // console.log(user);

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
      if (res.data.user.profileImage) {
        setProfileImage({ uri: res.data.user.profileImage });
      }
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
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", {
        uri,
        type: "image/jpeg",
        name: "profile.jpg",
      });
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      );

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      return result.secure_url;
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Error", "Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpdate = async (localUri) => {
    if (!localUri) {
      // Handle default image case
      await updateProfileImage("");
      setProfileImage(DEFAULT_PROFILE_IMAGE);
      return;
    }

    const cloudinaryUrl = await uploadImageToCloudinary(localUri);
    if (cloudinaryUrl) {
      await updateProfileImage(cloudinaryUrl);
      setProfileImage({ uri: cloudinaryUrl });
    }
  };

  const updateProfileImage = async (imageUrl) => {
    const token = await AsyncStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/auth/profile`,
        { profileImage: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Profile update failed:", err);
      Alert.alert("Error", "Failed to update profile");
      throw err;
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera access is needed to take photos"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      await handleImageUpdate(result.assets[0].uri);
    }
    setModalVisible(false);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Gallery access is needed to select photos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      await handleImageUpdate(result.assets[0].uri);
    }
    setModalVisible(false);
  };

  const removeImage = async () => {
    await handleImageUpdate("");
    setModalVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", onPress: confirmLogout, style: "destructive" },
    ]);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.log("Logout Error:", err);
      Alert.alert("Error", "Failed to log out");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.background }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={29} color={theme.primary} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <View>
            <Image
              source={profileImage}
              style={[styles.avatar, { borderColor: theme.border }]}
              defaultSource={DEFAULT_PROFILE_IMAGE}
            />
            <TouchableOpacity
              style={[styles.editImage, { backgroundColor: theme.primary }]}
              onPress={() => setModalVisible(true)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name || "User"}</Text>
          <Text style={[styles.subText, { color: theme.secondaryText }]}>
            {`${user?.age || "N/A"} year old from ${user?.address || "Unknown"}`}
          </Text>
          {user?.createdAt && (
            <Text style={[styles.subTextSmall, { color: theme.secondaryText }]}>
              Active since - {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Info</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile")}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
              <MaterialIcons
                name="edit"
                size={16}
                color={theme.primary}
                style={{ marginLeft: 5 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={24} color={theme.secondaryText} />
            <Text style={[styles.infoText, { color: theme.text }]}>{user?.email || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={24} color={theme.secondaryText} />
            <Text style={[styles.infoText, { color: theme.text }]}>{user?.mobile || "N/A"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons
              name={
                user?.gender === "Male"
                  ? "male"
                  : user?.gender === "Female"
                  ? "female"
                  : "person-outline"
              }
              size={24}
              color={theme.secondaryText}
            />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {user?.gender || "Prefer not to say"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            {user?.role === "admin" && (
              <MaterialIcons name="admin-panel-settings" size={24} color={theme.secondaryText} />
            )}
            {user?.role === "organizer" && (
              <MaterialIcons name="event" size={24} color={theme.secondaryText} />
            )}
            {user?.role === "customer" && (
              <MaterialIcons name="person" size={24} color={theme.secondaryText} />
            )}
            <Text style={[styles.infoText, { color: theme.text }]}>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : "N/A"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-pin" size={24} color={theme.secondaryText} />
            <Text style={[styles.infoText, { color: theme.text }]}>{user?.address || "N/A"}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.utilityRow}
            onPress={() => navigation.navigate("Help")}
          >
            <MaterialIcons name="help-outline" size={24} color={theme.text} />
            <Text style={[styles.utilityText, { color: theme.text }]}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityRow} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={theme.primary} />
            <Text style={[styles.utilityText, { color: theme.primary }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <ImagePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onPickCamera={openCamera}
          onPickGallery={openGallery}
          onRemoveImage={removeImage}
          uploading={uploading}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  editImage: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 15,
    padding: 5,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
  },
  subText: {
    fontSize: 16,
    marginTop: 4,
  },
  subTextSmall: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    padding: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  editText: {
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 15,
  },
  utilityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  utilityText: {
    fontSize: 16,
    marginLeft: 15,
  },
});

export default ProfileScreen;
