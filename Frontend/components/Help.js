import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function Help() {
  const { theme } = useTheme();

  const handleEmailPress = () => {
    Linking.openURL('mailto:danikami5425@gmail.com');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:9789628021');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Contact Us</Text>
        
        <View style={styles.contactSection}>
          <TouchableOpacity 
            style={styles.contactItem} 
            onPress={handleEmailPress}
          >
            <Ionicons name="mail-outline" size={24} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>
              danikami5425@gmail.com
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem} 
            onPress={handlePhonePress}
          >
            <Ionicons name="call-outline" size={24} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>
              +91 9789628021
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Our Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 26.1339224,
              longitude: 91.6206808,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: 26.1339224,
                longitude: 91.6206808,
              }}
              title="Assam Don Bosco University"
              description="Azara Guwahati"
            />
          </MapView>
        </View>

        <Text style={[styles.address, { color: theme.secondaryText }]}>
          Assam Don Bosco University, Azara Guwahati
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  contactSection: {
    marginBottom: 30,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  contactText: {
    fontSize: 16,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  address: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});
