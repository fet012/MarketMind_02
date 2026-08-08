import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import {
  RefreshControl,
  ScrollView,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const backgroundColor = "#F7F3EE";
const primaryAccent = "#F5A623";
const deepGreen = "#14532D";
const textAccent = "#1B6A3A";
const mutedText = "#5B6E5B";
const warmGlow = "#FDE9C8";
const negativeRed = "#C2410C";
const gold = "#D97706";

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
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const router = useRouter();

  const loadSummary = async (userId: string) => {
    try {
      setLoadingSummary(true);
      setSummaryError(false);
      const response = await axios.get<SummaryData>(
        `${API_BASE_URL}/summary?userId=${userId}`,
      );
      setSummary(response.data);
    } catch {
      setSummaryError(true);
      setSummary({ sales: 0, expenses: 0, profit: 0 });
    } finally {
      setLoadingSummary(false);
    }
  };

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

    loadUser();
  }, [router]);

  const onRefresh = async () => {
    if (!user?.userId) return;
    setRefreshing(true);
    await loadSummary(user.userId);
    setRefreshing(false);
  };

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
        colors={["#F7F3EE", "#F0E5D8", "#E7D6C1"]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.innerContainer}>
          {/* Header */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 350 }}
            style={styles.headerRow}
          >
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
              <Text style={styles.greeting}>
                {greeting}, {user.name}
              </Text>
              <Text style={styles.subheading}>
                Your business pulse looks bright today.
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <Ionicons name="sparkles" size={14} color={gold} />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          </MotiView>

          {/* Hero summary card */}
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 100 }}
            style={styles.heroCard}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <BlurView
              intensity={24}
              tint="light"
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>Today's Summary</Text>
                <View style={styles.heroBadge}>
                  <Ionicons name="trending-up-outline" size={16} color={deepGreen} />
                </View>
              </View>

              <Text style={styles.profitLabel}>Net Profit</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={[
                  styles.profitValue,
                  (summary?.profit ?? 0) < 0 ? styles.negativeValue : null,
                ]}
              >
                {loadingSummary ? "..." : formatCurrency(summary?.profit ?? 0)}
              </Text>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>Sales</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={styles.statValue}
                  >
                    {loadingSummary ? "..." : formatCurrency(summary?.sales ?? 0)}
                  </Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={styles.statValue}
                  >
                    {loadingSummary ? "..." : formatCurrency(summary?.expenses ?? 0)}
                  </Text>
                </View>
              </View>

              {summaryError ? (
                <Text style={styles.errorText}>Couldn't load data right now.</Text>
              ) : null}
            </View>
          </MotiView>

                  {/* Mic / voice */}
          <MotiView
            from={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 450, delay: 260 }}
            style={styles.micSection}
          >
            <Pressable
              style={styles.micButton}
              onPress={() => router.push("/chat")}
            >
              <LinearGradient
                colors={[primaryAccent, "#E08B00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              
              <Ionicons name="mic" size={50} color="#FFFDF7" />
            </Pressable>
            <Text style={styles.micLabel}>Tap to speak with MarketMind</Text>
          </MotiView>

          {/* Quick actions */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 180 }}
            style={styles.actionsRow}
          >
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/debts")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="wallet-outline" size={20} color={deepGreen} />
              </View>
              <Text style={styles.actionTitle}>Debts</Text>
              <Text style={styles.actionSubtitle}>Track owed money</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/history")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="time-outline" size={20} color={deepGreen} />
              </View>
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSubtitle}>Review activity</Text>
            </Pressable>
          </MotiView>

          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    justifyContent: "space-between",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: deepGreen,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: mutedText,
    maxWidth: 240,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,166,35,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(217,119,6,0.2)",
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: deepGreen,
  },
  // Hero card
  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroContent: {
    padding: 22,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: mutedText,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245,166,35,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  profitLabel: {
    fontSize: 14,
    color: mutedText,
    fontWeight: "600",
    marginBottom: 6,
  },
  profitValue: {
    fontSize: 34,
    fontWeight: "800",
    color: deepGreen,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(27,106,58,0.15)",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: mutedText,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: deepGreen,
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(27,106,58,0.12)",
    marginHorizontal: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    color: negativeRed,
    textAlign: "center",
  },
  // Quick actions
  actionsRow: {
    flexDirection: "row",
    gap: 14,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(27,106,58,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: warmGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: deepGreen,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: mutedText,
  },
  // Mic
  micSection: {
    alignItems: "center",
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  micLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: mutedText,
  },
  negativeValue: {
    color: negativeRed,
  },
});

