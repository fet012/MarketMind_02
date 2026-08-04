import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

const backgroundColor = "#F9F6F1";
const primaryAccent = "#F5A623";
const textAccent = "#1B6A3A";
const warmGlow = "#FDECCF";

type UserData = {
  userId?: string;
  name?: string;
  language?: string;
};

type SummaryData = {
  sales: number;
  expenses: number;
  profit: number;
};

export default function DashboardScreen() {
  const [user, setUser] = useState<UserData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("marketmind_user");

      if (!stored) {
        router.replace("/");
        return;
      }

      try {
        const parsed = JSON.parse(stored) as UserData;
        if (!parsed.name) {
          router.replace("/");
          return;
        }

        setUser(parsed);
        if (parsed.userId) {
          loadSummary(parsed.userId);
        }
      } catch {
        router.replace("/");
      }
    };

    const loadSummary = async (userId: string) => {
      try {
        setLoadingSummary(true);
        setSummaryError(false);
        const response = await axios.get<SummaryData>(
          `http://localhost:3000/summary?userId=${userId}`,
        );
        setSummary(response.data);
      } catch {
        setSummaryError(true);
        setSummary({ sales: 0, expenses: 0, profit: 0 });
      } finally {
        setLoadingSummary(false);
      }
    };

    loadUser();
  }, [router]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#FCF8EF", "#F7EFD8", "#F4E6C5"]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 350 }}
          style={styles.headerCard}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.94)", "rgba(249,246,241,0.84)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>
                {greeting}, {user.name}
              </Text>
              <Text style={styles.subheading}>
                Your business pulse is looking bright today.
              </Text>
            </View>
            <View style={styles.pillBadge}>
              <Ionicons name="sparkles" size={14} color={primaryAccent} />
              <Text style={styles.pillText}>Live insights</Text>
            </View>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 450, delay: 80 }}
          style={styles.summaryCard}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.68)", "rgba(249,246,241,0.52)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <BlurView
            intensity={18}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.summaryInner}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryEyebrow}>Snapshot</Text>
                <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
              </View>
              <View style={styles.summaryBadge}>
                <Ionicons
                  name="trending-up-outline"
                  size={16}
                  color={textAccent}
                />
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View
                  style={[styles.metricIcon, { backgroundColor: "#FDEECF" }]}
                >
                  <Ionicons name="cash-outline" size={16} color={textAccent} />
                </View>
                <Text style={styles.summaryLabel}>Sales</Text>
                <Text style={styles.summaryValue}>
                  {loadingSummary ? "..." : formatCurrency(summary?.sales ?? 0)}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View
                  style={[styles.metricIcon, { backgroundColor: "#E8F2EA" }]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={16}
                    color={textAccent}
                  />
                </View>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>
                  {loadingSummary
                    ? "..."
                    : formatCurrency(summary?.expenses ?? 0)}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View
                  style={[styles.metricIcon, { backgroundColor: "#FFF0D1" }]}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={16}
                    color={textAccent}
                  />
                </View>
                <Text style={styles.summaryLabel}>Profit</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    (summary?.profit ?? 0) < 0 ? styles.negativeValue : null,
                  ]}
                >
                  {loadingSummary
                    ? "..."
                    : formatCurrency(summary?.profit ?? 0)}
                </Text>
              </View>
            </View>

            {summaryError ? (
              <Text style={styles.errorText}>
                Couldn&apos;t load data right now.
              </Text>
            ) : null}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 400, delay: 140 }}
          style={styles.micArea}
        >
          <Pressable
            style={styles.micButton}
            onPress={() => router.push("/chat")}
          >
            <LinearGradient
              colors={[primaryAccent, "#F6B94A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.micInner}>
              <Ionicons name="mic" size={34} color="#FFFDF7" />
            </View>
          </Pressable>
          <Text style={styles.micLabel}>Tap to speak with MarketMind</Text>
        </MotiView>

        <View style={styles.linksRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/debts")}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="wallet-outline" size={18} color={textAccent} />
            </View>
            <Text style={styles.actionTitle}>Debts</Text>
            <Text style={styles.actionSubtitle}>Track what&apos;s owed</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/history")}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="time-outline" size={18} color={textAccent} />
            </View>
            <Text style={styles.actionTitle}>History</Text>
            <Text style={styles.actionSubtitle}>Review recent activity</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#4E6556",
    maxWidth: 220,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,166,35,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: {
    color: textAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginBottom: 16,
  },
  summaryInner: {
    position: "relative",
    zIndex: 1,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6E7C70",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
  },
  summaryBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245,166,35,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#4E6556",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: textAccent,
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    color: "#8A5A00",
    textAlign: "center",
  },
  micArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  micButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  micInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  micLabel: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
    color: textAccent,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: warmGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    color: textAccent,
    fontWeight: "700",
    fontSize: 14,
  },
  actionSubtitle: {
    color: "#6E7C70",
    fontSize: 12,
    marginTop: 2,
  },
  negativeValue: {
    color: "#C2410C",
  },
});
