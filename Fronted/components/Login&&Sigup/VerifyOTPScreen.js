import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import config from '../../config';
import { useTheme } from "../../context/ThemeContext";
const API_BASE_URL = config.API_BASE_URL;

const AnimatedInput = ({ label, value, onChangeText, error, onClear, theme, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = new Animated.Value(value ? 1 : 0);

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: 16,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [15, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.secondaryText, theme.primary],
    }),
    backgroundColor: theme.background,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  return (
    <View style={styles.inputContainer}>
      <Animated.Text style={labelStyle}>
        {label}
      </Animated.Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: isFocused ? theme.primary : theme.border,
            paddingTop: 15,
          },
          error && { borderColor: theme.error },
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={!isFocused && !value ? label : ''}
        placeholderTextColor={theme.secondaryText}
      />
      {value && onClear && (
        <TouchableOpacity
          style={styles.clearIcon}
          onPress={onClear}
        >
          <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function VerifyOTPScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { email } = route.params;
  // console.log(email);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { email, otp });
      
      if (response.data.status) {
        navigation.navigate('ResetPassword', { 
          email,
          tempToken: response.data.tempToken 
        });
      } else {
        Alert.alert('Error', response.data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      let errorMessage = 'Something went wrong. Please try again.';
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Verify OTP</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Enter the 6-digit OTP sent to {email}</Text>

      <AnimatedInput
        label="Enter OTP"
        value={otp}
        onChangeText={(text) => {
          setOtp(text);
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={6}
        error={error}
        onClear={() => setOtp('')}
        theme={theme}
      />
      {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendContainer}
        onPress={() => navigation.replace('ForgotPassword')}
      >
        <Text style={[styles.resendText, { color: theme.secondaryText }]}>Didn't receive OTP? </Text>
        <Text style={[styles.resendLink, { color: theme.primary }]}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});