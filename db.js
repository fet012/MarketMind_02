const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "marketmind.db"));

// Create the transactions table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    item TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create the debts table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debtor_name TEXT NOT NULL,
    item TEXT NOT NULL,
    original_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_paid INTEGER DEFAULT 0
  )
`);

function logTransaction(type, item, amount) {
  const stmt = db.prepare(
    "INSERT INTO transactions (type, item, amount) VALUES (?, ?, ?)",
  );
  const result = stmt.run(type, item, amount);
  return result.lastInsertRowid;
}

function getTodaySummary() {
  const rows = db
    .prepare(
      `
    SELECT type, SUM(amount) as total
    FROM transactions
    WHERE date(created_at) = date('now')
    GROUP BY type
  `,
    )
    .all();

  let sales = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.type === "sale") sales = row.total;
    if (row.type === "expense") expenses = row.total;
  }

  return {
    sales,
    expenses,
    profit: sales - expenses,
  };
}

function createDebt(debtorName, item, amount) {
  const stmt = db.prepare(`
    INSERT INTO debts (debtor_name, item, original_amount, remaining_amount)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(debtorName, item, amount, amount);
  return result.lastInsertRowid;
}

function getDebts(includeAllPaid = false) {
  if (includeAllPaid) {
    return db
      .prepare(
        `
      SELECT *
      FROM debts
      ORDER BY created_at DESC
    `,
      )
      .all();
  }

  return db
    .prepare(
      `
    SELECT *
    FROM debts
    WHERE is_paid = 0
    ORDER BY created_at DESC
  `,
    )
    .all();
}

function getDebtById(debtId) {
  return db
    .prepare(
      `
    SELECT *
    FROM debts
    WHERE id = ?
  `,
    )
    .get(debtId);
}

function payDebt(debtId, paymentAmount) {
  const debt = getDebtById(debtId);

  if (!debt) {
    throw new Error("Debt not found");
  }

  if (debt.is_paid === 1) {
    throw new Error("Debt is already fully paid");
  }

  if (paymentAmount > debt.remaining_amount) {
    throw new Error("Payment exceeds remaining debt amount");
  }

  const newRemainingAmount = Math.max(0, debt.remaining_amount - paymentAmount);
  const newIsPaid = newRemainingAmount === 0 ? 1 : 0;

  db.prepare(
    `
    UPDATE debts
    SET remaining_amount = ?, is_paid = ?
    WHERE id = ?
  `,
  ).run(newRemainingAmount, newIsPaid, debtId);

  logTransaction("sale", debt.item, paymentAmount);

  return getDebtById(debtId);
}

module.exports = {
  db,
  logTransaction,
  getTodaySummary,
  createDebt,
  getDebts,
  payDebt,
  getDebtById,
};
