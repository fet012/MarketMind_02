const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function logTransaction(userId, type, item, amount) {
  const normalizedType = type === "sale" || type === "expense" ? type : null;
  const normalizedItem = typeof item === "string" ? item.trim() : "";
  const normalizedAmount = Number(amount);

  if (!userId) throw new Error("userId is required");
  if (!normalizedType) throw new Error("type must be sale or expense");
  if (!normalizedItem) throw new Error("item is required");
  if (Number.isNaN(normalizedAmount) || normalizedAmount < 0) {
    throw new Error("amount must be a non-negative number");
  }

  const result = await db.execute({
    sql: "INSERT INTO transactions (user_id, type, item, amount) VALUES (?, ?, ?, ?)",
    args: [userId, normalizedType, normalizedItem, normalizedAmount],
  });
  return Number(result.lastInsertRowid);
}

async function getTransactionById(userId, transactionId) {
  const result = await db.execute({
    sql: "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
    args: [transactionId, userId],
  });
  return result.rows[0] || null;
}

async function updateTransaction(userId, transactionId, fields = {}) {
  const existing = await getTransactionById(userId, transactionId);
  if (!existing) throw new Error("Transaction not found");

  const updates = [];
  const values = [];

  if (fields.type !== undefined) {
    const normalizedType =
      fields.type === "sale" || fields.type === "expense" ? fields.type : null;
    if (!normalizedType) throw new Error("type must be sale or expense");
    updates.push("type = ?");
    values.push(normalizedType);
  }

  if (fields.item !== undefined) {
    const normalizedItem =
      typeof fields.item === "string" ? fields.item.trim() : "";
    if (!normalizedItem) throw new Error("item is required");
    updates.push("item = ?");
    values.push(normalizedItem);
  }

  if (fields.amount !== undefined) {
    const normalizedAmount = Number(fields.amount);
    if (Number.isNaN(normalizedAmount) || normalizedAmount < 0) {
      throw new Error("amount must be a non-negative number");
    }
    updates.push("amount = ?");
    values.push(normalizedAmount);
  }

  if (updates.length === 0) return existing;

  values.push(transactionId, userId);
  await db.execute({
    sql: `UPDATE transactions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    args: values,
  });

  return getTransactionById(userId, transactionId);
}

async function deleteTransaction(userId, transactionId) {
  const existing = await getTransactionById(userId, transactionId);
  if (!existing) throw new Error("Transaction not found");

  await db.execute({
    sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?",
    args: [transactionId, userId],
  });
  return existing;
}

async function getTodaySummary(userId) {
  const result = await db.execute({
    sql: `
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND date(created_at) = date('now')
      GROUP BY type
    `,
    args: [userId],
  });

  let sales = 0;
  let expenses = 0;
  for (const row of result.rows) {
    if (row.type === "sale") sales = row.total;
    if (row.type === "expense") expenses = row.total;
  }

  return { sales, expenses, profit: sales - expenses };
}

async function getTransactionHistory(userId, limit = 50) {
  const result = await db.execute({
    sql: `
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  return result.rows;
}

async function getSalesByItem(userId) {
  const result = await db.execute({
    sql: `
      SELECT item, SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ? AND type = 'sale'
      GROUP BY item
      ORDER BY total_amount DESC, item ASC
    `,
    args: [userId],
  });
  return result.rows;
}

async function getExpensesByItem(userId) {
  const result = await db.execute({
    sql: `
      SELECT item, SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ? AND type = 'expense'
      GROUP BY item
      ORDER BY total_amount DESC, item ASC
    `,
    args: [userId],
  });
  return result.rows;
}

async function getRecentTransactions(userId, limit = 10) {
  const result = await db.execute({
    sql: `
      SELECT id, type, item, amount, created_at
      FROM transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  return result.rows;
}

async function getDebtSummary(userId) {
  const result = await db.execute({
    sql: `
      SELECT debtor_name, item, remaining_amount, is_paid
      FROM debts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });
  return result.rows;
}

async function createDebt(userId, debtorName, item, amount) {
  const result = await db.execute({
    sql: `
      INSERT INTO debts (user_id, debtor_name, item, original_amount, remaining_amount)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [userId, debtorName, item, amount, amount],
  });
  return Number(result.lastInsertRowid);
}

async function getDebts(userId, includeAllPaid = false) {
  const sql = includeAllPaid
    ? "SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM debts WHERE user_id = ? AND is_paid = 0 ORDER BY created_at DESC";

  const result = await db.execute({ sql, args: [userId] });
  return result.rows;
}

async function getDebtById(userId, debtId) {
  const result = await db.execute({
    sql: "SELECT * FROM debts WHERE id = ? AND user_id = ?",
    args: [debtId, userId],
  });
  return result.rows[0] || null;
}

async function payDebt(userId, debtId, paymentAmount) {
  const debt = await getDebtById(userId, debtId);

  if (!debt) throw new Error("Debt not found");
  if (debt.is_paid === 1) throw new Error("Debt is already fully paid");
  if (paymentAmount > debt.remaining_amount) {
    throw new Error("Payment exceeds remaining debt amount");
  }

  const newRemainingAmount = Math.max(0, debt.remaining_amount - paymentAmount);
  const newIsPaid = newRemainingAmount === 0 ? 1 : 0;

  await db.execute({
    sql: "UPDATE debts SET remaining_amount = ?, is_paid = ? WHERE id = ? AND user_id = ?",
    args: [newRemainingAmount, newIsPaid, debtId, userId],
  });

  await logTransaction(userId, "sale", debt.item, paymentAmount);

  return getDebtById(userId, debtId);
}

module.exports = {
  db,
  logTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTodaySummary,
  getTransactionHistory,
  getSalesByItem,
  getExpensesByItem,
  getRecentTransactions,
  getDebtSummary,
  createDebt,
  getDebts,
  payDebt,
  getDebtById,
};