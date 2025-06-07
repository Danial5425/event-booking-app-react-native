import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StripeWrapper } from "./utils/stripe";
import { LogBox } from 'react-native';

import { ThemeProvider } from "./context/ThemeContext";

// Ignore specific warnings
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

// Authentication Screens
import LoginScreen from "./components/Login&&Sigup/LoginScreen";
import SignupScreen from "./components/Login&&Sigup/SignupScreen";
import ForgotPasswordScreen from "./components/Login&&Sigup/ForgotPasswordScreen";
import ResetPasswordScreen from "./components/Login&&Sigup/ResetPasswordScreen";
import VerifyOTPScreen from "./components/Login&&Sigup/VerifyOTPScreen";

// User Role Screens
import CustomerScreen from "./components/Uers/Customer/Customer";
import OrganizerScreen from "./components/Uers/Organizer/Organizer";
import AdminScreen from "./components/Uers/Admin/Admin";

// Profile Screens
import ProfileScreen from "./components/Profile/ProfileScreen";
import UploadToCloudinary from "./components/UploadToCloudinary";
import EditProfileScreen from "./components/Profile/EditProfileScreen";

import EditEvent from "./components/Uers/Organizer/EditEvent";
import EventDetailsScreen from "./components/Uers/Customer/EventDetailsScreen";

// Booking Screens
import MyTickets from "./components/Booking/MyTickets";
import TicketScreen from "./components/Booking/TicketScreen";
import OrganizerDashboard from "./components/Booking/OrganizerDashboard";
import TicketDetailsScreen from "./screens/TicketDetailsScreen";

// Help Screen
import Help from "./components/Help";

const Stack = createStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <StripeWrapper>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
          >
            {/* Authentication Screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />

            {/* Password Recovery Flow */}
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

            {/* Main App Screens */}
            <Stack.Screen name="Customer" component={CustomerScreen} />
            <Stack.Screen name="Organizer" component={OrganizerScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />

            {/* Profile Screens */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />

            {/* Event Screens */}
            <Stack.Screen name="EditEvent" component={EditEvent} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />

            {/* Booking Screens */}
            <Stack.Screen name="MyTickets" component={MyTickets} />
            <Stack.Screen name="Ticket" component={TicketScreen} />
            <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
            <Stack.Screen name="OrganizerDashboard" component={OrganizerDashboard} />

            {/* Help Screen */}
            <Stack.Screen name="Help" component={Help} />
          </Stack.Navigator>
        </NavigationContainer>
      </StripeWrapper>
    </ThemeProvider>
  );
}
