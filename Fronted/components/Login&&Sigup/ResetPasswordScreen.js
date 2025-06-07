import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import config from '../../config';
import { useTheme } from "../../context/ThemeContext";

const AnimatedInput = ({ label, value, onChangeText, error, onClear, secureTextEntry, showPassword, onTogglePassword, theme, ...props }) => {
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
        secureTextEntry={secureTextEntry}
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
      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={onTogglePassword}
        >
          <MaterialIcons
            name={showPassword ? "visibility-off" : "visibility"}
            size={24}
            color={theme.secondaryText}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function ResetPasswordScreen({ route, navigation }) {
  const { theme } = useTheme();
  const API_BASE_URL = config.API_BASE_URL;
  const { email, tempToken } = route.params;
  // console.log(email, tempToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
        tempToken, 
        newPassword 
      });
      
      if (response.data.status) {
        Alert.alert('Success', 'Password reset successfully', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
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
      <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Create a new password for {email}</Text>

      <AnimatedInput
        label="New Password"
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          setError('');
        }}
        secureTextEntry={!showPassword}
        error={error}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        theme={theme}
      />

      <AnimatedInput
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError('');
        }}
        secureTextEntry={!showPassword}
        error={error}
        theme={theme}
      />

      {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
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
    paddingRight: 40,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  eyeIcon: {
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
});