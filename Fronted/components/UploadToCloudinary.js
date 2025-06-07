import React, {useState} from 'react';
import {View, Text, Button, Image, StyleSheet, ActivityIndicator} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import axios from 'axios';

const UploadToCloudinary = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo'}, response => {
      if (!response.didCancel && response.assets?.length > 0) {
        const image = response.assets[0];
        uploadToCloudinary(image);
      }
    });
  };

  const uploadToCloudinary = async (image) => {
    setUploading(true);
    const data = new FormData();
    data.append('file', {
      uri: image.uri,
      type: image.type,
      name: image.fileName || `upload_${Date.now()}.jpg`,
    });
    data.append('upload_preset', 'booking'); // Your unsigned preset
    data.append('cloud_name', 'dozmkz4i8');  // Your cloud name

    try {
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/dozmkz4i8/image/upload',
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setImageUrl(res.data.secure_url);
    } catch (err) {
      console.error('Upload failed:', err.message);
      alert('Image upload failed. Please try again.');
    }
    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Pick and Upload Image" onPress={pickImage} />
      {uploading && <ActivityIndicator size="large" color="#0000ff" style={{marginTop: 20}} />}
      {imageUrl && (
        <>
          <Text style={{marginTop: 20}}>Uploaded Image:</Text>
          <Image source={{uri: imageUrl}} style={styles.image} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16},
  image: {width: 200, height: 200, marginTop: 20, borderRadius: 8},
});

export default UploadToCloudinary;
