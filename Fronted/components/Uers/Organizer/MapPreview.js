// MapPreview.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../../context/ThemeContext';

const MapPreview = ({ location, onPress }) => {
  const { theme } = useTheme();

  if (!location?.coordinates) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.mapPreviewPlaceholder, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Text style={{ color: theme.text }}>Tap to select location</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={[styles.mapPreviewContainer, { borderColor: theme.border }]}>
      <MapView
        style={styles.mapPreview}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        initialRegion={{
          latitude: location.coordinates.lat,
          longitude: location.coordinates.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coordinates.lat,
            longitude: location.coordinates.lng,
          }}
        />
      </MapView>
      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText} numberOfLines={1}>
          {location.displayAddress || location.address}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mapPreviewContainer: {
    height: 150,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPreviewPlaceholder: {
    height: 150,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  mapOverlayText: {
    color: 'white',
    fontSize: 14,
  },
});

export default MapPreview;