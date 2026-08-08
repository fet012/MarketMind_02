import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
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

// ---- Shared palette (matches dashboard) ----
const bgGradient = ["#FBF7EE", "#F4E9D2", "#ECDAB2"] as const;
const deepGreen = "#0F2E1F";
const midGreen = "#1B6A3A";
const softEmerald = "#2E7D53";
const gold = "#F5A623";
const richGold = "#D98A1F";
const cream = "#FFFBF3";
const textDark = "#1F2A22";
const textMuted = "#6E7C70";

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
        colors={bgGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        {/* ---------- Header ---------- */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={styles.headerRow}
        >
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={midGreen} />
          </Pressable>
          <Text style={styles.title}>Debts</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={[gold, richGold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add" size={16} color={cream} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </MotiView>

        {/* ---------- Hero summary ---------- */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 80 }}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={[deepGreen, midGreen, softEmerald]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />

          <Text style={styles.heroEyebrow}>OUTSTANDING BALANCE</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={styles.heroValue}
          >
            {formatCurrency(outstandingTotal)}
          </Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroFooterRow}>
            <View style={styles.heroFooterChip}>
              <Ionicons name="folder-open-outline" size={14} color={gold} />
              <Text style={styles.heroFooterText}>
                {openCount} open {openCount === 1 ? "debt" : "debts"}
              </Text>
            </View>
            <View style={styles.heroFooterChip}>
              <Ionicons name="people-outline" size={14} color={gold} />
              <Text style={styles.heroFooterText}>
                {debts.length} total
              </Text>
            </View>
          </View>
        </MotiView>

        {/* ---------- List ---------- */}
        {loading ? (
          <View style={styles.centerState}>
            <Text style={styles.loadingText}>Loading debts…</Text>
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={28} color={midGreen} />
            </View>
            <Text style={styles.emptyText}>No debts recorded yet</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {debts.map((debt, index) => (
              <MotiView
                key={debt.id}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: 350,
                  delay: 60 * Math.min(index, 6),
                }}
                style={styles.debtCard}
              >
                <View style={styles.debtTopRow}>
                  <View style={styles.debtIconWrap}>
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={midGreen}
                    />
                  </View>
                  <View style={styles.debtTextWrap}>
                    <Text style={styles.debtorName} numberOfLines={1}>
                      {debt.debtor_name}
                    </Text>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {debt.item}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      debt.is_paid === 1
                        ? styles.statusBadgePaid
                        : styles.statusBadgeOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        debt.is_paid === 1
                          ? styles.statusBadgeTextPaid
                          : styles.statusBadgeTextOpen,
                      ]}
                    >
                      {debt.is_paid === 1 ? "Paid" : "Open"}
                    </Text>
                  </View>
                </View>

                <View style={styles.debtBottomRow}>
                  <View style={styles.debtAmountWrap}>
                    <Text style={styles.amountLabel}>Remaining</Text>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      style={styles.amountText}
                    >
                      {formatCurrency(debt.remaining_amount)}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(debt.created_at)}
                  </Text>
                </View>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedDebtId(debt.id);
                    setShowPayModal(true);
                  }}
                >
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={16}
                    color={midGreen}
                  />
                  <Text style={styles.secondaryButtonText}>
                    Record Payment
                  </Text>
                </Pressable>
              </MotiView>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ---------- Add Debt Modal ---------- */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Debt</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Debtor name</Text>
            <TextInput
              style={styles.input}
              value={debtorName}
              onChangeText={setDebtorName}
              placeholder="e.g. Mama Ngozi"
              placeholderTextColor="#A3AA9F"
            />
            <Text style={styles.label}>Item</Text>
            <TextInput
              style={styles.input}
              value={item}
              onChangeText={setItem}
              placeholder="e.g. Bag of rice"
              placeholderTextColor="#A3AA9F"
            />
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="₦0"
              keyboardType="numeric"
              placeholderTextColor="#A3AA9F"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleCreateDebt}
              >
                <LinearGradient
                  colors={[gold, richGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </Modal>

      {/* ---------- Record Payment Modal ---------- */}
      <Modal visible={showPayModal} transparent animationType="fade">
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Pressable onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Payment amount</Text>
            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="₦0"
              keyboardType="numeric"
              placeholderTextColor="#A3AA9F"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleRecordPayment}
              >
                <LinearGradient
                  colors={[gold, richGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },

  // ---------- Header ----------
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: textDark,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: richGold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addButtonText: {
    color: cream,
    fontWeight: "700",
    fontSize: 13,
  },

  // ---------- Hero ----------
  heroCard: {
    borderRadius: 26,
    overflow: "hidden",
    padding: 20,
    marginBottom: 16,
    shadowColor: deepGreen,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,251,243,0.7)",
    letterSpacing: 1.2,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: "800",
    color: cream,
    marginTop: 8,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginVertical: 14,
  },
  heroFooterRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroFooterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroFooterText: {
    color: "rgba(255,251,243,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },

  // ---------- List ----------
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  debtCard: {
    backgroundColor: "#ffff)",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  debtTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  debtIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(245,166,35,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  debtTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  debtorName: {
    fontSize: 15,
    fontWeight: "700",
    color: textDark,
  },
  itemName: {
    fontSize: 12.5,
    color: textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(245,166,35,0.16)",
  },
  statusBadgePaid: {
    backgroundColor: "rgba(27,106,58,0.12)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadgeTextOpen: {
    color: richGold,
  },
  statusBadgeTextPaid: {
    color: midGreen,
  },
  debtBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    marginBottom: 12,
  },
  debtAmountWrap: {
    flexShrink: 1,
    marginRight: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: textMuted,
    marginBottom: 2,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "800",
    color: textDark,
  },
  timestamp: {
    fontSize: 11.5,
    color: textMuted,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(27,106,58,0.08)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: midGreen,
    fontWeight: "700",
    fontSize: 13,
  },

  // ---------- Empty / loading ----------
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: midGreen,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(27,106,58,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: {
    color: textMuted,
    fontSize: 14.5,
    fontWeight: "500",
  },

  // ---------- Modals ----------
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: cream,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: textDark,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: midGreen,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.14)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: textDark,
    backgroundColor: "#FFFFFF",
    fontSize: 14.5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "rgba(27,106,58,0.08)",
  },
  cancelButtonText: {
    color: midGreen,
    fontWeight: "700",
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: richGold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonText: {
    color: cream,
    fontWeight: "700",
    fontSize: 14,
  },
});