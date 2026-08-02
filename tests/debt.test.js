const assert = require("assert");
const { createDebt, getDebts, payDebt, getDebtById } = require("../db");

function run() {
  const initialDebts = getDebts(true);
  const beforeCount = initialDebts.length;

  const debtId = createDebt("Test Customer", "Rice bag", 500);
  const debt = getDebtById(debtId);

  assert.ok(debtId, "createDebt should return an id");
  assert.strictEqual(debt.debtor_name, "Test Customer");
  assert.strictEqual(debt.original_amount, 500);
  assert.strictEqual(debt.remaining_amount, 500);
  assert.strictEqual(debt.is_paid, 0);

  const partial = payDebt(debtId, 200);
  assert.strictEqual(partial.remaining_amount, 300);
  assert.strictEqual(partial.is_paid, 0);

  const afterPartial = getDebtById(debtId);
  assert.strictEqual(afterPartial.remaining_amount, 300);
  assert.strictEqual(afterPartial.is_paid, 0);

  const settled = payDebt(debtId, 300);
  assert.strictEqual(settled.remaining_amount, 0);
  assert.strictEqual(settled.is_paid, 1);

  const allDebts = getDebts(true);
  assert.strictEqual(allDebts.length, beforeCount + 1);

  assert.throws(() => payDebt(debtId, 1), /already fully paid/i);

  console.log("debt test passed");
}

try {
  run();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
