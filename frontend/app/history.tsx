import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const backgroundColor = "#F7F3EE";
const textAccent = "#1B6A3A";
const deepGreen = "#14532D";
const mutedText = "#5B6E5B";
const salesColor = "#1B6A3A";
const expenseColor = "#C2410C";
const warmGlow = "#FDE9C8";
const gold = "#D97706";

type Transaction = {
  id: number;
  type: string;
  item: string;
  amount: number;
  created_at: string;
};

type GroupedTransactions = {
  label: string;
  transactions: Transaction[];
};

export default function HistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState<"sale" | "expense">("sale");
  const [formItem, setFormItem] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormType("sale");
    setFormItem("");
    setFormAmount("");
    setEditingId(null);
    setFormError(null);
  };

  const getUserId = async () => {
    const stored = await AsyncStorage.getItem("marketmind_user");
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.userId as string | undefined;
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) {
        setTransactions([]);
        return;
      }
      const response = await axios.get<Transaction[]>(
        `${API_BASE_URL}/transactions?userId=${userId}`,
      );
      setTransactions(response.data);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const formatTimestamp = (value: string) => {
    const normalizedValue = value.includes(" ")
      ? value.replace(" ", "T") + "Z"
      : value;
    const date = new Date(normalizedValue);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  const groupedTransactions = useMemo(() => {
    const groups: GroupedTransactions[] = [];
    const byDay = new Map<string, Transaction[]>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const dayKey = date.toDateString();
      const existing = byDay.get(dayKey);
      if (existing) {
        existing.push(transaction);
      } else {
        byDay.set(dayKey, [transaction]);
      }
    });

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    sortedDays.forEach((dayKey) => {
      const dayTransactions = byDay.get(dayKey) || [];
      const date = new Date(dayKey);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      let label = date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });

      if (isToday) {
        label = "Today";
      } else if (isYesterday) {
        label = "Yesterday";
      }

      groups.push({
        label,
        transactions: dayTransactions.sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }),
      });
    });

    return groups;
  }, [transactions]);

  const summaryTitle = useMemo(() => {
    return transactions.length === 0
      ? "No transactions yet"
      : "Transaction History";
  }, [transactions.length]);

  const handleSubmit = async () => {
    if (!formItem.trim() || !formAmount.trim()) {
      setFormError("Please enter an item and amount.");
      return;
    }

    const parsedAmount = Number(formAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError("Amount must be a valid non-negative number.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const userId = await getUserId();
      if (!userId) {
        setFormError("Could not identify your profile. Please restart the app.");
        return;
      }

      const payload = {
        type: formType,
        item: formItem.trim(),
        amount: parsedAmount,
        userId,
      };

      if (editingId !== null) {
        await axios.put(
          `${API_BASE_URL}/transactions/${editingId}`,
          payload,
        );
      } else {
        await axios.post(`${API_BASE_URL}/transactions`, payload);
      }

      await loadTransactions();
      resetForm();
    } catch {
      setFormError("Could not save the transaction right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormType(transaction.type as "sale" | "expense");
    setFormItem(transaction.item);
    setFormAmount(String(transaction.amount));
    setFormError(null);
  };

  const handleDelete = (transactionId: number) => {
    Alert.alert(
      "Delete transaction?",
      "This will remove the entry permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await getUserId();
              if (!userId) {
                Alert.alert("Unable to delete", "Missing user profile.");
                return;
              }
              await axios.delete(
                `${API_BASE_URL}/transactions/${transactionId}`,
                { data: { userId } },
              );
              if (editingId === transactionId) {
                resetForm();
              }
              await loadTransactions();
            } catch {
              Alert.alert("Unable to delete", "Please try again.");
            }
          },
        },
      ],
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

      <View style={styles.container}>
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 350 }}
          style={styles.headerRow}
        >
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={deepGreen} />
          </Pressable>
          <Text style={styles.title}>History</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 60 }}
        >
          <Text style={styles.subtitle}>{summaryTitle}</Text>
        </MotiView>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 450, delay: 100 }}
          style={styles.formCard}
        >
          <Text style={styles.formTitle}>
            {editingId ? "Edit transaction" : "Add transaction"}
          </Text>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <View style={styles.typeRow}>
            <Pressable
              style={[
                styles.typeChip,
                formType === "sale" ? styles.activeChip : null,
              ]}
              onPress={() => setFormType("sale")}
            >
              <Ionicons
                name="trending-up-outline"
                size={14}
                color={formType === "sale" ? "#FFFDF7" : deepGreen}
              />
              <Text
                style={
                  formType === "sale"
                    ? styles.activeChipText
                    : styles.inactiveChipText
                }
              >
                Sale
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.typeChip,
                formType === "expense" ? styles.activeChip : null,
              ]}
              onPress={() => setFormType("expense")}
            >
              <Ionicons
                name="trending-down-outline"
                size={14}
                color={formType === "expense" ? "#FFFDF7" : deepGreen}
              />
              <Text
                style={
                  formType === "expense"
                    ? styles.activeChipText
                    : styles.inactiveChipText
                }
              >
                Expense
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            value={formItem}
            onChangeText={setFormItem}
            placeholder="Item"
            placeholderTextColor="#8F9A92"
          />

          <TextInput
            style={styles.input}
            value={formAmount}
            onChangeText={setFormAmount}
            placeholder="Amount"
            keyboardType="decimal-pad"
            placeholderTextColor="#8F9A92"
          />

          <View style={styles.formActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add transaction"}
              </Text>
            </Pressable>

            {editingId ? (
              <Pressable style={styles.secondaryButton} onPress={resetForm}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </MotiView>

        {loading ? (
          <View style={styles.centerState}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>No transactions recorded yet</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {groupedTransactions.map((group) => (
              <View key={group.label} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.label}</Text>
                {group.transactions.map((transaction) => (
                  <MotiView
                    key={transaction.id}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 220 }}
                    style={styles.card}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.itemWrap}>
                        <View style={styles.titleRow}>
                          <View
                            style={[
                              styles.iconBadge,
                              transaction.type === "expense"
                                ? styles.expenseBadge
                                : styles.saleBadge,
                            ]}
                          >
                            <Ionicons
                              name={
                                transaction.type === "expense"
                                  ? "trending-down-outline"
                                  : "trending-up-outline"
                              }
                              size={15}
                              color={deepGreen}
                            />
                          </View>
                          <View style={styles.itemCopy}>
                            <Text style={styles.itemName}>
                              {transaction.item}
                            </Text>
                            <Text style={styles.timestamp}>
                              {formatTimestamp(transaction.created_at)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.amountColumn}>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.6}
                          style={[
                            styles.amount,
                            transaction.type === "expense"
                              ? styles.expenseText
                              : styles.saleText,
                          ]}
                        >
                          {transaction.type === "expense" ? "-" : "+"}
                          {formatCurrency(transaction.amount)}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>
                            {transaction.type === "expense"
                              ? "Expense"
                              : "Sale"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleEdit(transaction)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color={deepGreen}
                        />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(transaction.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#C2410C"
                        />
                        <Text style={[styles.actionButtonText, { color: "#C2410C" }]}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </MotiView>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
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
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    marginRight: 10,
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
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: deepGreen,
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    color: mutedText,
    marginBottom: 14,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: deepGreen,
    marginBottom: 10,
  },
  formError: {
    color: "#B45309",
    fontSize: 13,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    backgroundColor: "#FFFDF7",
  },
  activeChip: {
    backgroundColor: deepGreen,
    borderColor: deepGreen,
  },
  activeChipText: {
    color: "#FFFDF7",
    fontWeight: "700",
    fontSize: 13,
  },
  inactiveChipText: {
    color: deepGreen,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#FFFDF7",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: "#1F2A24",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: deepGreen,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    flex: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "rgba(27,106,58,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: deepGreen,
    fontWeight: "700",
    fontSize: 15,
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemWrap: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: warmGlow,
  },
  saleBadge: {
    backgroundColor: "#EAF4EC",
  },
  expenseBadge: {
    backgroundColor: "#FDECEC",
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: deepGreen,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: mutedText,
  },
  amountColumn: {
    alignItems: "flex-end",
    maxWidth: 130,
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  typeBadge: {
    marginTop: 4,
    backgroundColor: warmGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: deepGreen,
    fontSize: 11,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF4EC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deleteButton: {
    backgroundColor: "#FDECEC",
  },
  actionButtonText: {
    color: deepGreen,
    fontWeight: "700",
    fontSize: 12,
  },
  saleText: {
    color: salesColor,
  },
  expenseText: {
    color: expenseColor,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: deepGreen,
    fontSize: 16,
  },
  emptyText: {
    color: mutedText,
    fontSize: 15,
  },
});