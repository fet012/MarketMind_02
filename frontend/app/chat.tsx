import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useState } from "react";
import { API_BASE_URL } from "../config";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const backgroundColor = "#F7F3EE";
const primaryAccent = "#F5A623";
const textAccent = "#1B6A3A";
const deepGreen = "#14532D";
const mutedText = "#5B6E5B";
const warmGlow = "#FDE9C8";
const gold = "#D97706";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ParseResponse = {
  type?: string | null;
  item?: string | null;
  amount?: number | null;
  reply?: string | null;
  error?: string;
};

type AskResponse = {
  answer?: string;
  error?: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Welcome to MarketMind. Tell me about your sale or expense.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const buildReply = (data: ParseResponse) => {
    if (data.reply) {
      return data.reply;
    }

    if (data.error) {
      return "Sorry, I didn't understand that — try again";
    }

    if (
      !data.type ||
      !data.item ||
      data.amount === undefined ||
      data.amount === null
    ) {
      return "Sorry, I didn't understand that — try again";
    }

    if (data.type === "sale") {
      return `Recorded: sold ${data.item} for ₦${Number(data.amount).toLocaleString()}`;
    }

    if (data.type === "expense") {
      return `Recorded: spent ₦${Number(data.amount).toLocaleString()} on ${data.item}`;
    }

    return "Sorry, I didn't understand that — try again";
  };

  const handleAskQuestion = async (
    question: string,
    language: string,
    userId: string,
  ) => {
    const response = await axios.post<AskResponse>(`${API_BASE_URL}/ask`, {
      question,
      language,
      userId,
    });

    return (
      response.data.answer || "I couldn't find a grounded answer for that."
    );
  };

  const getUserProfile = async () => {
    const storedUser = await AsyncStorage.getItem("marketmind_user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    return {
      userId: parsedUser?.userId as string | undefined,
      language: parsedUser?.language === "pidgin" ? "pidgin" : "english",
    };
  };

  const isLikelyQuestion = (text: string) => {
    const normalized = text.toLowerCase().trim();
    if (!normalized) {
      return false;
    }

    const questionMarkers = [
      "who",
      "what",
      "when",
      "where",
      "why",
      "how",
      "which",
      "can",
      "should",
      "could",
      "would",
      "maybe",
      "do",
      "did",
      "is",
      "are",
      "?",
    ];

    return questionMarkers.some((marker) => normalized.includes(marker));
  };

  const handleSend = async () => {
    if (!input.trim()) {
      return;
    }

    const userMessage = input.trim();
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userMessage,
    };

    setMessages((current) => [...current, newMessage]);
    setInput("");
    setLoading(true);
    setStatusMessage(null);

    try {
      const { userId, language } = await getUserProfile();

      if (!userId) {
        throw new Error("Missing user profile");
      }

      if (isLikelyQuestion(userMessage)) {
        const answer = await handleAskQuestion(userMessage, language, userId);
        const assistantReply: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: answer,
        };

        setMessages((current) => [...current, assistantReply]);
        return;
      }

      const response = await axios.post<ParseResponse>(
        `${API_BASE_URL}/parse`,
        {
          message: userMessage,
          language,
          userId,
        },
      );
      const assistantReply: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: buildReply(response.data),
      };

      setMessages((current) => [...current, assistantReply]);
    } catch {
      const assistantReply: ChatMessage = {
        id: `${Date.now()}-assistant-error`,
        role: "assistant",
        text: "Sorry, I didn't understand that — try again",
      };

      setMessages((current) => [...current, assistantReply]);
    } finally {
      setLoading(false);
    }
  };

  const getRecordingUploadMetadata = async (uri: string) => {
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      const actualMimeType = blob.type || "audio/webm";
      const extension = actualMimeType.includes("wav")
        ? "wav"
        : actualMimeType.includes("webm")
          ? "webm"
          : actualMimeType.includes("mp4")
            ? "mp4"
            : actualMimeType.includes("m4a")
              ? "m4a"
              : actualMimeType.includes("mpeg") ||
                  actualMimeType.includes("mp3")
                ? "mp3"
                : "bin";

      return { actualMimeType, extension, blob };
    }

    return {
      actualMimeType: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
      extension: Platform.OS === "ios" ? "m4a" : "mp4",
      blob: null as Blob | null,
    };
  };

  const handleVoiceToggle = async () => {
    Alert.alert(
      "Coming soon",
      "Voice recording isn't available in this version yet — please type your message instead.",
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#F7F3EE", "#F0E5D8", "#E7D6C1"]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
      >
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 350 }}
          style={styles.headerCard}
        >
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={deepGreen} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>MarketMind Chat</Text>
            <Text style={styles.headerSubtitle}>
              Voice or text, whichever feels easier.
            </Text>
          </View>
        </MotiView>

        <ScrollView
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <MotiView
              key={message.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220 }}
              style={[
                styles.messageRow,
                message.role === "user" ? styles.userRow : styles.assistantRow,
              ]}
            >
              <LinearGradient
                colors={
                  message.role === "user"
                    ? [deepGreen, "#347B53"]
                    : ["rgba(255,255,255,0.9)", "rgba(248,240,225,0.95)"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.messageBubble,
                  message.role === "user"
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === "user"
                      ? styles.userText
                      : styles.assistantText,
                  ]}
                >
                  {message.text}
                </Text>
              </LinearGradient>
            </MotiView>
          ))}

          {loading ? (
            <View style={styles.loadingRow}>
              <View style={styles.assistantBubble}>
                <Text style={styles.assistantText}>Thinking...</Text>
              </View>
            </View>
          ) : null}

          {statusMessage ? (
            <View style={styles.statusRow}>
              <View style={styles.assistantBubble}>
                <Text style={styles.assistantText}>{statusMessage}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message"
            placeholderTextColor="#8F9A92"
            multiline
          />
          <Pressable
            style={[
              styles.iconButton,
              isRecording ? styles.recordingButton : null,
            ]}
            onPress={handleVoiceToggle}
          >
            <Ionicons
              name={isRecording ? "stop-circle" : "mic"}
              size={18}
              color={deepGreen}
            />
          </Pressable>
          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#FFFDF7" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: deepGreen,
  },
  headerSubtitle: {
    fontSize: 12,
    color: mutedText,
    marginTop: 2,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chatContent: {
    paddingBottom: 16,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  userBubble: {
    borderColor: "rgba(255,255,255,0.2)",
  },
  assistantBubble: {
    backgroundColor: "transparent",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: deepGreen,
  },
  loadingRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFDF7",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    color: "#1F2A24",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
  },
  iconButton: {
    backgroundColor: warmGlow,
    borderRadius: 14,
    width: 44,
    height: 44,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
  },
  recordingButton: {
    backgroundColor: "#FFE9E2",
    borderColor: primaryAccent,
  },
  sendButton: {
    backgroundColor: primaryAccent,
    borderRadius: 14,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});