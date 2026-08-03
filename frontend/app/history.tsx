import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

const backgroundColor = "#F9F6F1";
const textAccent = "#1B6A3A";
const salesColor = "#1B6A3A";
const expenseColor = "#C2410C";

type Transaction = {
  id: number;
  type: string;
  item: string;
  amount: number;
  created_at: string;
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

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Transaction[]>(
        "http://localhost:3000/transactions",
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
    const date = new Date(value);
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
      const payload = {
        type: formType,
        item: formItem.trim(),
        amount: parsedAmount,
      };

      if (editingId !== null) {
        await axios.put(
          `http://localhost:3000/transactions/${editingId}`,
          payload,
        );
      } else {
        await axios.post("http://localhost:3000/transactions", payload);
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
              await axios.delete(
                `http://localhost:3000/transactions/${transactionId}`,
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
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>History</Text>
        </View>

        <Text style={styles.subtitle}>{summaryTitle}</Text>

        <View style={styles.formCard}>
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
        </View>

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
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.itemWrap}>
                    <Text style={styles.itemName}>{transaction.item}</Text>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(transaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.amountColumn}>
                    <Text
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
                        {transaction.type === "expense" ? "Expense" : "Sale"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleEdit(transaction)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(transaction.id)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </Pressable>
                </View>
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
    backgroundColor: backgroundColor,
  },
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  backText: {
    color: textAccent,
    fontWeight: "600",
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: textAccent,
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    color: "#4E6556",
    marginBottom: 14,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EADFCF",
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 8,
  },
  formError: {
    color: "#B45309",
    fontSize: 13,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7E0D8",
  },
  activeChip: {
    backgroundColor: textAccent,
    borderColor: textAccent,
  },
  activeChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  inactiveChipText: {
    color: textAccent,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#FFFDF7",
    borderWidth: 1,
    borderColor: "#EFE2C4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#1F2A24",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: textAccent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F2EBDD",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: textAccent,
    fontWeight: "700",
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7E0D8",
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
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#4E6556",
  },
  amountColumn: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
  typeBadge: {
    marginTop: 4,
    backgroundColor: "#F7F0E4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: textAccent,
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
    backgroundColor: "#EAF4EC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deleteButton: {
    backgroundColor: "#FDECEC",
  },
  actionButtonText: {
    color: textAccent,
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
    color: textAccent,
    fontSize: 16,
  },
  emptyText: {
    color: "#4E6556",
    fontSize: 15,
  },
});
