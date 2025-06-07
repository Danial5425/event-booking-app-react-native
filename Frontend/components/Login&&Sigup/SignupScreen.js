import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import config from '../../config';
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const API_BASE_URL = config.API_BASE_URL;

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

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [secretCode, setSecretCode] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const validateInputs = () => {
    let valid = true;
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
      valid = false;
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    if (role === "admin" && !secretCode) {
      newErrors.secretCode = "Secret code is required for admin registration";
      valid = false;
    } else if (role === "admin" && secretCode !== "Admin@0032") {
      newErrors.secretCode = "Invalid secret code";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        username,
        email,
        password,
        role,
        secretCode,
      });

      if (response.data.status) {
        Alert.alert("Success", "Account created successfully", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "Signup failed. Please try again.";
      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = "Email already exists";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const RadioButton = ({ label, value }) => (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={() => {
        setRole(value);
        if (value !== "admin") setSecretCode("");
        setErrors({ ...errors, secretCode: "" });
      }}
    >
      <View style={[
        styles.radio,
        role === value && { backgroundColor: theme.primary }
      ]} />
      <Text style={[styles.radioLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Join us to get started</Text>

            <AnimatedInput
              label="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors({ ...errors, username: "" });
              }}
              autoCapitalize="words"
              error={errors.username}
              onClear={() => setUsername("")}
              theme={theme}
            />
            {errors.username && (
              <Text style={[styles.errorText, { color: theme.primary }]}>{errors.username}</Text>
            )}

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
            {errors.email && (
              <Text style={[styles.errorText, { color: theme.primary }]}>{errors.email}</Text>
            )}

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

            <Text style={[styles.label, { color: theme.text }]}>Select Role:</Text>
            <View style={styles.radioGroup}>
              <RadioButton label="Customer" value="customer" />
              <RadioButton label="Organizer" value="organizer" />
              <RadioButton label="Admin" value="admin" />
            </View>

            {role === "admin" && (
              <AnimatedInput
                label="Secret Code"
                value={secretCode}
                onChangeText={(text) => {
                  setSecretCode(text);
                  if (errors.secretCode) setErrors({ ...errors, secretCode: "" });
                }}
                secureTextEntry={!showSecretCode}
                error={errors.secretCode}
                showPassword={showSecretCode}
                onTogglePassword={() => setShowSecretCode(!showSecretCode)}
                theme={theme}
              />
            )}
            {errors.secretCode && (
              <Text style={[styles.errorText, { color: theme.primary }]}>{errors.secretCode}</Text>
            )}

            <Image
              source={require("../../assets/signup.png")}
              style={styles.image}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: theme.secondaryText }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={[styles.loginLink, { color: theme.primary }]}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: width * 0.7,
    height: height * 0.2,
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
  inputError: {
    borderColor: "#F76B45",
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
  label: {
    fontSize: 16,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  radioGroup: {
    width: "100%",
    marginBottom: 24,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F76B45",
    marginRight: 12,
  },
  radioSelected: {
    backgroundColor: "#F76B45",
  },
  radioLabel: {
    fontSize: 16,
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
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
