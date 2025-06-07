import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import config from '../../config';
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = config.API_BASE_URL;
const { width } = Dimensions.get("window");

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

export default function LoginScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateInputs = () => {
    let valid = true;
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
  
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
  
      // console.log("Login response:", response.data); 
  
      if (response.data.status) {
        const userData = response.data.user;
  
        // Prepare data for AsyncStorage
        const multiSetData = [
          ["token", response.data.token],
          ["userId", response.data._id],
          ["userRole", response.data.role],
        ];
  
        // Only store userData if it's defined
        if (userData !== undefined) {
          multiSetData.push(["userData", JSON.stringify(userData)]);
        }
  
        await AsyncStorage.multiSet(multiSetData);
  
        // Determine which screen to navigate based on role
        let targetScreen;
        switch (response.data.role) {
          case "admin":
            targetScreen = "Admin";
            break;
          case "organizer":
            targetScreen = "Organizer";
            break;
          case "customer":
          default:
            targetScreen = "Customer";
        }
  
        Alert.alert("Success", "Login successful", [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Something went wrong. Please try again.";
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../assets/login.png")}
            style={styles.image}
          />
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Login to your account</Text>

          <AnimatedInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            onClear={() => setEmail("")}
            theme={theme}
          />
          {errors.email && <Text style={[styles.errorText, { color: theme.primary }]}>{errors.email}</Text>}

          <AnimatedInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            secureTextEntry={!showPassword}
            error={errors.password}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            theme={theme}
          />
          {errors.password && (
            <Text style={[styles.errorText, { color: theme.primary }]}>{errors.password}</Text>
          )}

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={[styles.forgotPasswordText, { 
              color: isDarkMode ? '#F76B45' : '#020b73'
            }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.secondaryText }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={[styles.signupLink, { color: theme.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: width * 0.7,
    height: width * 0.5,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
    position: "relative",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  clearIcon: {
    position: "absolute",
    right: 16,
    top: 15,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 13,
  },
  errorText: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
  },
});