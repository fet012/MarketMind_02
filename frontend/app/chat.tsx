import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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

  const buildReply = (data: ParseResponse) => {
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

    try {
      const response = await axios.post<ParseResponse>(
        "http://localhost:3000/parse",
        {
          message: userMessage,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>MarketMind Chat</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E0D8",
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: textAccent,
    fontWeight: "600",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
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
  },
  userBubble: {
    backgroundColor: textAccent,
  },
  assistantBubble: {
    backgroundColor: "#FFFFFF",
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
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E7E0D8",
    backgroundColor: backgroundColor,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    color: "#1F2A24",
    borderWidth: 1,
    borderColor: "#E7E0D8",
  },
  sendButton: {
    backgroundColor: primaryAccent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
