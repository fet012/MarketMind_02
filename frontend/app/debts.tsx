import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Modal,
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

type Debt = {
  id: number;
  debtor_name: string;
  item: string;
  original_amount: number;
  remaining_amount: number;
  created_at: string;
  is_paid: number;
};

export default function DebtsScreen() {
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
  const [debtorName, setDebtorName] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const getUserId = async () => {
    const stored = await AsyncStorage.getItem("marketmind_user");
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.userId as string | undefined;
  };

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) {
        setDebts([]);
        return;
      }
      const response = await axios.get<Debt[]>(
        `${API_BASE_URL}/debts?userId=${userId}`,
      );
      setDebts(response.data);
    } catch {
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleCreateDebt = async () => {
    if (!debtorName.trim() || !item.trim() || !amount) {
      return;
    }

    try {
      const userId = await getUserId();
      if (!userId) return;

      await axios.post(`${API_BASE_URL}/debts`, {
        debtorName: debtorName.trim(),
        item: item.trim(),
        amount: Number(amount),
        userId,
      });
      setDebtorName("");
      setItem("");
      setAmount("");
      setShowAddModal(false);
      fetchDebts();
    } catch {
      // ignore for now
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedDebtId || !paymentAmount) {
      return;
    }

    try {
      const userId = await getUserId();
      if (!userId) return;

      await axios.post(`${API_BASE_URL}/debts/${selectedDebtId}/pay`, {
        amount: Number(paymentAmount),
        userId,
      });
      setPaymentAmount("");
      setSelectedDebtId(null);
      setShowPayModal(false);
      fetchDebts();
    } catch {
      // ignore for now
    }
  };

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

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

  const outstandingTotal = useMemo(
    () => debts.reduce((total, debt) => total + debt.remaining_amount, 0),
    [debts],
  );

  const openCount = debts.filter((debt) => debt.is_paid !== 1).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#FCF8EF", "#F7EFD8", "#F4E6C5"]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={textAccent} />
          </Pressable>
          <Text style={styles.title}>Debts</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={16} color="#FFFDF7" />
            <Text style={styles.primaryButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Overview</Text>
            <Text style={styles.heroTitle}>Track pending balances</Text>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Outstanding</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(outstandingTotal)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Open</Text>
              <Text style={styles.metricValue}>{openCount}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <Text style={styles.loadingText}>Loading debts...</Text>
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>No debts recorded yet</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {debts.map((debt) => (
              <View key={debt.id} style={styles.debtCard}>
                <View style={styles.debtIconWrap}>
                  <Ionicons
                    name="receipt-outline"
                    size={18}
                    color={textAccent}
                  />
                </View>
                <View style={styles.debtTopRow}>
                  <View style={styles.debtTextWrap}>
                    <Text style={styles.debtorName}>{debt.debtor_name}</Text>
                    <Text style={styles.itemName}>{debt.item}</Text>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(debt.created_at)}
                    </Text>
                  </View>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountText}>
                      {formatCurrency(debt.remaining_amount)}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        {debt.is_paid === 1 ? "Paid" : "Open"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedDebtId(debt.id);
                    setShowPayModal(true);
                  }}
                >
                  <Ionicons
                    name="arrow-forward-outline"
                    size={15}
                    color={textAccent}
                  />
                  <Text style={styles.secondaryButtonText}>Record Payment</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Debt</Text>
            <Text style={styles.label}>Debtor name</Text>
            <TextInput
              style={styles.input}
              value={debtorName}
              onChangeText={setDebtorName}
              placeholder="Debtor name"
              placeholderTextColor="#8F9A92"
            />
            <Text style={styles.label}>Item</Text>
            <TextInput
              style={styles.input}
              value={item}
              onChangeText={setItem}
              placeholder="Item"
              placeholderTextColor="#8F9A92"
            />
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              keyboardType="numeric"
              placeholderTextColor="#8F9A92"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={handleCreateDebt}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.label}>Payment amount</Text>
            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="Amount"
              keyboardType="numeric"
              placeholderTextColor="#8F9A92"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={handleRecordPayment}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  backButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: textAccent,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: primaryAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  primaryButtonText: {
    color: "#FFFDF7",
    fontWeight: "700",
    fontSize: 13,
  },
  heroCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 14,
  },
  heroText: {
    marginBottom: 10,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6E7C70",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
    marginTop: 3,
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFF9EE",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6E7C70",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: textAccent,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.83)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  debtIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDEECF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  debtTopRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  debtorName: {
    fontSize: 15,
    fontWeight: "700",
    color: textAccent,
  },
  itemName: {
    fontSize: 13,
    color: "#4E6556",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#4E6556",
    marginTop: 4,
  },
  amountColumn: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 14,
    fontWeight: "700",
    color: textAccent,
  },
  statusBadge: {
    marginTop: 4,
    backgroundColor: "#EAF4EC",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: textAccent,
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#F5EFD8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: textAccent,
    fontWeight: "700",
    fontSize: 12,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: textAccent,
    fontSize: 16,
  },
  emptyText: {
    color: "#4E6556",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: textAccent,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7E0D8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#1F2A24",
    backgroundColor: "#FFFDF7",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5EFD8",
  },
  cancelButtonText: {
    color: textAccent,
    fontWeight: "700",
  },
});
