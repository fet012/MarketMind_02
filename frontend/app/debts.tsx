import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Debt[]>("http://localhost:3000/debts");
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
      await axios.post("http://localhost:3000/debts", {
        debtorName: debtorName.trim(),
        item: item.trim(),
        amount: Number(amount),
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
      await axios.post(`http://localhost:3000/debts/${selectedDebtId}/pay`, {
        amount: Number(paymentAmount),
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
          <Text style={styles.title}>Debts</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.primaryButtonText}>Add Debt</Text>
          </Pressable>
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
                <View style={styles.debtTopRow}>
                  <View style={styles.debtTextWrap}>
                    <Text style={styles.debtorName}>{debt.debtor_name}</Text>
                    <Text style={styles.itemName}>{debt.item}</Text>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(debt.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.amountText}>
                    {formatCurrency(debt.remaining_amount)}
                  </Text>
                </View>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedDebtId(debt.id);
                    setShowPayModal(true);
                  }}
                >
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
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  backButton: {
    flexShrink: 0,
  },
  backText: {
    color: textAccent,
    fontWeight: "600",
    fontSize: 16,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: textAccent,
  },
  primaryButton: {
    backgroundColor: primaryAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  debtCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E0D8",
  },
  debtTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  debtTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  debtorName: {
    fontSize: 16,
    fontWeight: "700",
    color: textAccent,
  },
  itemName: {
    fontSize: 14,
    color: "#4E6556",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#4E6556",
    marginTop: 4,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    color: textAccent,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF4EC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: textAccent,
    fontWeight: "700",
    fontSize: 13,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
    color: "#1F2A24",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1EDE6",
  },
  cancelButtonText: {
    color: textAccent,
    fontWeight: "700",
    fontSize: 13,
  },
});
