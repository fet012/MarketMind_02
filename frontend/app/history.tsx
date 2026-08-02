import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

  useEffect(() => {
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
  amount: {
    fontSize: 15,
    fontWeight: "700",
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
