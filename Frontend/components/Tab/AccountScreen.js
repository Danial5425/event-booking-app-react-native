import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Account</Text>

      <TouchableOpacity 
        style={[styles.listItem, { backgroundColor: theme.cardBackground }]} 
        onPress={() => navigation.navigate("Profile")}
      >
        <View style={styles.listItemContent}>
          <Icon name="person" size={24} color={theme.text} />
          <Text style={[styles.listText, { color: theme.text }]}>Profile</Text>
        </View>
        <Icon name="chevron-right" size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.themeContainer}>
          <View style={styles.themeTextContainer}>
            <Icon name={isDarkMode ? "dark-mode" : "light-mode"} size={24} color={theme.text} />
            <Text style={[styles.listText, { color: theme.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.background}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.listItem, { backgroundColor: theme.cardBackground }]} 
        onPress={() => navigation.navigate("Contact")}
      >
        <View style={styles.listItemContent}>
          <Icon name="contact-support" size={24} color={theme.text} />
          <Text style={[styles.listText, { color: theme.text }]}>Contact Us</Text>
        </View>
        <Icon name="chevron-right" size={24} color={theme.text} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 80, 
    paddingHorizontal: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    textAlign: 'center' 
  },
  listItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listText: { 
    fontSize: 18 
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  themeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  }
});
