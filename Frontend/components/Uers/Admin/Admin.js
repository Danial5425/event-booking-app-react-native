import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';

// Admin Screens
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import EventManagement from './EventManagement';
import AdminEventManagement from './AdminEventManagement';
import Settings from './Settings';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Optional: If you want bottom tabs for Admin as well
function AdminTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'AdminDashboard') iconName = 'home-outline';
          else if (route.name === 'UserManagement') iconName = 'people-outline';
          else if (route.name === 'AdminEventManagement') iconName = 'calendar-outline';
          else if (route.name === 'Settings') iconName = 'settings-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondaryText,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: {
          color: theme.text,
        },
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboard} />
      <Tab.Screen name="UserManagement" component={UserManagement} />
      <Tab.Screen name="AdminEventManagement" component={AdminEventManagement} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}

// Main Admin Stack Navigator
export default function Admin() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.background }
      }}
    >
      {/* Either use the Tabs version or direct stack screens */}
      <Stack.Screen name="AdminMain" component={AdminTabs} />
      
      {/* Or if you prefer stack navigation without tabs: */}
      {/* <Stack.Screen name="AdminDashboard" component={AdminDashboard} /> */}
      {/* <Stack.Screen name="UserManagement" component={UserManagement} /> */}
      {/* <Stack.Screen name="EventManagement" component={EventManagement} /> */}
      {/* <Stack.Screen name="Settings" component={Settings} /> */}
    </Stack.Navigator>
  );
}