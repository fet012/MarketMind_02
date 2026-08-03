import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

const backgroundColor = "#F9F6F1";
const primaryAccent = "#F5A623";
const textAccent = "#1B6A3A";

type UserData = {
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
      } catch {
        router.replace("/");
      }
    };

    const loadSummary = async () => {
      try {
        setLoadingSummary(true);
        setSummaryError(false);
        const response = await axios.get<SummaryData>(
          "http://localhost:3000/summary",
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
    loadSummary();
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
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.greeting}>
              {greeting}, {user.name}
            </Text>
            <Text style={styles.subheading}>
              Here is your trading overview.
            </Text>
          </View>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>Live insights</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Sales</Text>
              <Text style={styles.summaryValue}>
                {loadingSummary ? "..." : formatCurrency(summary?.sales ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>
                {loadingSummary
                  ? "..."
                  : formatCurrency(summary?.expenses ?? 0)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={styles.summaryValue}>
                {loadingSummary ? "..." : formatCurrency(summary?.profit ?? 0)}
              </Text>
            </View>
          </View>

          {summaryError ? (
            <Text style={styles.errorText}>
              Couldn&apos;t load data right now.
            </Text>
          ) : null}
        </View>

        <View style={styles.micArea}>
          <Pressable
            style={styles.micButton}
            onPress={() => router.push("/chat")}
          >
            <View style={styles.micInner}>
              <Text style={styles.micIcon}>🎤</Text>
            </View>
          </Pressable>
          <Text style={styles.micLabel}>Tap to speak with MarketMind</Text>
        </View>

        <View style={styles.linksRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/debts")}
          >
            <Text style={styles.actionTitle}>Debts</Text>
            <Text style={styles.actionSubtitle}>Track what&apos;s owed</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/history")}
          >
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
    backgroundColor: backgroundColor,
  },
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
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
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#4E6556",
  },
  pillBadge: {
    backgroundColor: "#F7F0E4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: textAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EADFCF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: textAccent,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#4E6556",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
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
    paddingVertical: 16,
  },
  micButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: primaryAccent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  micInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: "#FFFFFFCC",
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: {
    fontSize: 48,
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
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADFCF",
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
});
