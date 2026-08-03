import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useState } from "react";
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

const backgroundColor = "#F9F6F1";
const primaryAccent = "#F5A623";
const textAccent = "#1B6A3A";

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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
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

  const handleAskQuestion = async (question: string, language: string) => {
    const response = await axios.post<AskResponse>(
      "http://localhost:3000/ask",
      {
        question,
        language,
      },
    );

    return (
      response.data.answer || "I couldn't find a grounded answer for that."
    );
  };

  const getLanguagePreference = async () => {
    const storedUser = await AsyncStorage.getItem("marketmind_user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    return parsedUser?.language === "pidgin" ? "pidgin" : "english";
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
      const language = await getLanguagePreference();

      try {
        const response = await axios.post<ParseResponse>(
          "http://localhost:3000/parse",
          {
            message: userMessage,
            language,
          },
        );

        const assistantReply: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: buildReply(response.data),
        };

        setMessages((current) => [...current, assistantReply]);
        return;
      } catch (parseError) {
        const answer = await handleAskQuestion(userMessage, language);
        const assistantReply: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: answer,
        };

        setMessages((current) => [...current, assistantReply]);
      }
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

  const handleVoiceToggle = async () => {
    if (loading) {
      return;
    }

    if (isRecording) {
      if (!recording) {
        setIsRecording(false);
        return;
      }

      try {
        setStatusMessage("Processing voice note...");
        setLoading(true);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setIsRecording(false);

        if (!uri) {
          throw new Error("No audio recorded");
        }

        const formData = new FormData();
        formData.append("audio", {
          uri,
          name: "voice.m4a",
          type: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
        } as any);

        const language = await getLanguagePreference();
        const response = await axios.post<ParseResponse & { text?: string }>(
          "http://localhost:3000/voice",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const transcribedText = response.data.text?.trim();
        if (transcribedText) {
          const userMessage: ChatMessage = {
            id: `${Date.now()}-voice-user`,
            role: "user",
            text: transcribedText,
          };
          setMessages((current) => [...current, userMessage]);
        }

        const assistantReply: ChatMessage = {
          id: `${Date.now()}-voice-assistant`,
          role: "assistant",
          text: response.data.reply || buildReply(response.data),
        };

        setMessages((current) => [...current, assistantReply]);
      } catch (error) {
        const assistantReply: ChatMessage = {
          id: `${Date.now()}-voice-error`,
          role: "assistant",
          text: "Sorry, I couldn't process that voice note — try again",
        };

        setMessages((current) => [...current, assistantReply]);
      } finally {
        setLoading(false);
        setStatusMessage(null);
      }

      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Please allow microphone access so you can record voice messages.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      const recordingOptions =
        (Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY ||
        (Audio as any).RecordingOptionsPresets?.HIGH_QUALITY;
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setStatusMessage("🎙 Listening...");
    } catch {
      Alert.alert("Recording failed", "We couldn't start recording right now.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerCard}>
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>MarketMind Chat</Text>
            <Text style={styles.headerSubtitle}>
              Voice or text, whichever feels easier.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === "user" ? styles.userRow : styles.assistantRow,
              ]}
            >
              <View
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
              </View>
            </View>
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
            <Text style={styles.iconButtonText}>
              {isRecording ? "■" : "🎙"}
            </Text>
          </Pressable>
          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
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
    backgroundColor: backgroundColor,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADFCF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backText: {
    color: textAccent,
    fontWeight: "600",
    fontSize: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6E7C70",
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
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E0D8",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  userBubble: {
    backgroundColor: textAccent,
  },
  assistantBubble: {
    backgroundColor: "#FFFDF7",
    borderColor: primaryAccent,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: textAccent,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADFCF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFDF7",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    color: "#1F2A24",
    borderWidth: 1,
    borderColor: "#EFE2C4",
  },
  iconButton: {
    backgroundColor: "#F7F0E4",
    borderRadius: 14,
    width: 44,
    height: 44,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EADFCF",
  },
  recordingButton: {
    backgroundColor: "#FFE7E7",
    borderColor: primaryAccent,
  },
  iconButtonText: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: primaryAccent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    minWidth: 64,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
