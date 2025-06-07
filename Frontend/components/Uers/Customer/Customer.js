import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";

import HomeScreen from "../../Tab/HomeScreen";
import SearchScreen from "../../Tab/SearchScreen";
import TicketScreen from "../../Tab/TicketScreen";
import AccountScreen from "../../Tab/AccountScreen";


const Tab = createBottomTabNavigator();

export default function Customer() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Search") iconName = "search-outline";
          else if (route.name === "Ticket") iconName = "ticket-outline";
          else if (route.name === "Account") iconName = "person-outline";
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#F76B45",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Ticket" component={TicketScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      
    </Tab.Navigator>
  );
}
