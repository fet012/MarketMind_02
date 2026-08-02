require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  logTransaction,
  getTodaySummary,
  createDebt,
  getDebts,
  payDebt,
  getDebtById,
} = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/parse", async (req, res) => {
  const { message } = req.body;

  const prompt = `
You are MarketMind, a business assistant for Nigerian market traders.
Read the trader's message and extract transaction data.

Respond with ONLY valid JSON, no other text, in this exact format:
{
  "type": "sale" or "expense",
  "item": "item name",
  "amount": number
}

If the message is not a transaction, respond with:
{"type": null, "item": null, "amount": null}

Trader's message: "${message}"
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    console.log("[Gemma raw response]:", raw);

    const matches = [...raw.matchAll(/\{[^{}]*\}/g)];
    let parsed = null;

    for (let i = matches.length - 1; i >= 0; i--) {
      try {
        const candidate = JSON.parse(matches[i][0]);
        if ("type" in candidate) {
          parsed = candidate;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!parsed) {
      return res
        .status(422)
        .json({ error: "Could not extract valid JSON", raw });
    }
    if (parsed.type && parsed.item && parsed.amount) {
      logTransaction(parsed.type, parsed.item, parsed.amount);
    }

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/summary", (req, res) => {
  res.json(getTodaySummary());
});

app.post("/debts", (req, res) => {
  const { debtorName, item, amount } = req.body;

  if (!debtorName || !item || amount === undefined || amount === null) {
    return res
      .status(400)
      .json({ error: "debtorName, item, and amount are required" });
  }

  try {
    const debtId = createDebt(debtorName, item, Number(amount));
    const debt = getDebtById(debtId);
    res.status(201).json(debt);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/debts", (req, res) => {
  const includeAll = req.query.includeAll === "true";
  res.json(getDebts(includeAll));
});

app.post("/debts/:id/pay", (req, res) => {
  const debtId = Number(req.params.id);
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: "amount is required" });
  }

  try {
    const updatedDebt = payDebt(debtId, Number(amount));
    res.json(updatedDebt);
  } catch (error) {
    const message = error.message || "Unable to process payment";
    if (message === "Debt not found") {
      return res.status(404).json({ error: message });
    }
    if (
      message === "Payment exceeds remaining debt amount" ||
      message === "Debt is already fully paid"
    ) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MarketMind server running on port ${PORT}`);
});
