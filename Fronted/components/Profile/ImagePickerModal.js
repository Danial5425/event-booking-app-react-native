import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

const ImagePickerModal = ({
  visible,
  onClose,
  onPickCamera,
  onPickGallery,
  onRemoveImage,
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity 
        style={[styles.overlay, { backgroundColor: theme.overlay }]} 
        onPress={onClose} 
      />
      <View style={[styles.modal, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={styles.option} 
          onPress={onPickCamera}
        >
          <Ionicons name="camera" size={24} color={theme.primary} />
          <Text style={[styles.text, { color: theme.text }]}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option} 
          onPress={onPickGallery}
        >
          <MaterialIcons name="photo-library" size={24} color={theme.primary} />
          <Text style={[styles.text, { color: theme.text }]}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option} 
          onPress={onRemoveImage}
        >
          <MaterialIcons name="delete" size={24} color={theme.error} />
          <Text style={[styles.text, { color: theme.error }]}>Remove Image</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default ImagePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  modal: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  text: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
  },
});
