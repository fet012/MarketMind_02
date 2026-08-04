import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as Crypto from "expo-crypto";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const backgroundColor = "#F9F6F1";
const primaryAccent = "#F5A623";
const textAccent = "#1B6A3A";

export default function OnboardingScreen() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"English" | "Pidgin">("Pidgin");
  const router = useRouter();

  const handleStart = async () => {
    if (!name.trim()) {
      return;
    }

    const userId = Crypto.randomUUID();

    await AsyncStorage.setItem(
      "marketmind_user",
      JSON.stringify({ userId, name: name.trim(), language }),
    );

    router.push("/dashboard");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>MM</Text>
          </View>
          <Text style={styles.title}>MarketMind</Text>
          <Text style={styles.subtitle}>
            Welcome, trader. Let’s get started.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#8F9A92"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Language</Text>
          <View style={styles.languageRow}>
            <Pressable
              style={[
                styles.languageOption,
                language === "English" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("English")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "English" && styles.languageTextActive,
                ]}
              >
                English
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.languageOption,
                language === "Pidgin" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("Pidgin")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "Pidgin" && styles.languageTextActive,
                ]}
              >
                Pidgin
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, !name.trim() && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={!name.trim()}
          >
            <Text style={styles.buttonText}>Start Trading</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgroundColor,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: backgroundColor,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: primaryAccent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#4E6556",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: textAccent,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7E0D8",
    backgroundColor: "#FCFAF6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#1F2A24",
  },
  languageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  languageOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E5DA",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F5F9F6",
  },
  languageOptionActive: {
    backgroundColor: "#E7F2EB",
    borderColor: textAccent,
  },
  languageText: {
    color: "#4E6556",
    fontWeight: "600",
  },
  languageTextActive: {
    color: textAccent,
  },
  button: {
    backgroundColor: primaryAccent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
