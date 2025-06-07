import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from '../../../context/ThemeContext';

import OrganizerHome from "./OrganizerHome";
import MyEvents from "./MyEvents";
import CreateEvent from "./CreateEvent";
import OrganizerAccount from "../../Tab/AccountScreen";
import SearchScreen from "../../Tab/SearchScreen";

const Tab = createBottomTabNavigator();

export default function Organizer() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "MyEvents") iconName = "list-outline";
          else if (route.name === "SearchScreen") iconName = "search-outline"; 
          else if (route.name === "CreateEvent") iconName = "add-circle-outline";
          else if (route.name === "Account") iconName = "person-outline";
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondaryText,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="MyEvents" 
        component={MyEvents}
        options={{
          tabBarLabel: 'My Events',
        }}
      />
      <Tab.Screen 
        name="SearchScreen" 
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen 
        name="CreateEvent" 
        component={CreateEvent}
        options={{
          tabBarLabel: 'Create',
        }}
      />
      <Tab.Screen 
        name="Account" 
        component={OrganizerAccount}
        options={{
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}
