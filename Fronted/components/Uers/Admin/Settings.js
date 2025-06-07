import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useTheme } from "../../../context/ThemeContext";

export default function Settings({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Admin Settings</Text>

      <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
        <Text style={[styles.settingText, { color: theme.text }]}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={theme.switchTrack}
        />
      </View>

      <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
        <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={theme.switchTrack}
        />
      </View>

      <TouchableOpacity
        style={[styles.listItem, { borderBottomColor: theme.border }]}
        onPress={() => navigation.navigate("Profile")}
      >
        <Text style={[styles.settingText, { color: theme.text }]}>Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  listItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
});
