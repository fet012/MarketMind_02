require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
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
} = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });

async function parseUserMessage(message, language = "english") {
  const isPidgin = language === "pidgin";

  const prompt = `
You are MarketMind, a business assistant for Nigerian market traders.
Read the trader's message and extract transaction data.
${isPidgin ? "Respond naturally, as a Nigerian Pidgin speaker would." : ""}

Respond with ONLY valid JSON, no other text, in this exact format:
{
  "type": "sale" or "expense",
  "item": "item name",
  "amount": number,
  "reply": "short natural-language confirmation"
}

If the message is not a transaction, respond with:
{"type": null, "item": null, "amount": null, "reply": "short natural-language confirmation"}

Trader's message: "${message}"
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  console.log("[Gemma raw response]:", raw);

  const matches = [...raw.matchAll(/\{[^{}]*\}/g)];
  let parsed = null;

  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(matches[i][0]);
      if ("type" in candidate && "reply" in candidate) {
        parsed = candidate;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!parsed) {
    return { parsed: null, raw };
  }

  if (parsed.type && parsed.item && parsed.amount) {
    logTransaction(parsed.type, parsed.item, parsed.amount);
  }

  return { parsed, raw };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/parse", async (req, res) => {
  const { message, language = "english" } = req.body;

  try {
    const { parsed, raw } = await parseUserMessage(message, language);

    if (!parsed) {
      return res
        .status(422)
        .json({ error: "Could not extract valid JSON", raw });
    }

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/voice", upload.single("audio"), async (req, res) => {
  const language = req.body?.language || req.query?.language || "english";

  if (!req.file) {
    return res.status(400).json({ error: "audio file is required" });
  }

  try {
    const form = new FormData();
    form.append("audio", req.file.buffer, {
      filename: req.file.originalname || "audio.wav",
      contentType: req.file.mimetype || "audio/wav",
      knownLength: req.file.buffer.length,
    });

    const sttResponse = await axios.post(
      "http://localhost:8001/transcribe",
      form,
      {
        headers: form.getHeaders(),
      },
    );

    const text = sttResponse?.data?.text || "";
    if (!text) {
      return res
        .status(422)
        .json({ error: "No transcript returned", text: "" });
    }

    const { parsed, raw } = await parseUserMessage(text, language);
    if (!parsed) {
      return res
        .status(422)
        .json({ error: "Could not extract valid JSON", raw, text });
    }

    res.json({ ...parsed, text });
  } catch (error) {
    console.error(error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message;
    res
      .status(status === 500 ? 502 : status)
      .json({ error: message, text: "" });
  }
});

function buildAskContext() {
  const summary = getTodaySummary();
  const salesByItem = getSalesByItem();
  const expensesByItem = getExpensesByItem();
  const recentTransactions = getRecentTransactions(10);
  const debts = getDebtSummary();

  return {
    summary,
    salesByItem,
    expensesByItem,
    recentTransactions,
    debts,
  };
}

async function answerQuestion(question, language = "english") {
  const context = buildAskContext();
  const isPidgin = language === "pidgin";

  const prompt = `
You are MarketMind, a business assistant for Nigerian market traders.
Answer the trader's question using ONLY the data provided below.
${isPidgin ? "Respond naturally, as a Nigerian Pidgin speaker would." : ""}

Return ONLY valid JSON in this exact format:
{"answer": "short practical answer"}

Important:
- Do not invent facts.
- If the data is missing or insufficient, say so clearly.
- Keep the answer concise and practical.

Context data:
${JSON.stringify(context, null, 2)}

Question: "${question}"
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  console.log("[Gemma ask raw response]:", raw);

  const matches = [...raw.matchAll(/\{[^{}]*\}/g)];
  let parsed = null;

  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(matches[i][0]);
      if ("answer" in candidate) {
        parsed = candidate;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!parsed || typeof parsed.answer !== "string") {
    return "I couldn't find a grounded answer for that.";
  }

  return parsed.answer;
}

app.get("/summary", (req, res) => {
  res.json(getTodaySummary());
});

app.post("/ask", async (req, res) => {
  const { question, language = "english" } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const answer = await answerQuestion(question, language);
    res.json({ answer, context: buildAskContext() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/transactions", (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(getTransactionHistory(limit));
});

app.post("/transactions", (req, res) => {
  try {
    const { type, item, amount } = req.body;
    const transactionId = logTransaction(type, item, amount);
    res.status(201).json(getTransactionById(transactionId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/transactions/:id", (req, res) => {
  const transactionId = Number(req.params.id);

  try {
    const updated = updateTransaction(transactionId, req.body);
    res.json(updated);
  } catch (error) {
    if (error.message === "Transaction not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

app.delete("/transactions/:id", (req, res) => {
  const transactionId = Number(req.params.id);

  try {
    const removed = deleteTransaction(transactionId);
    res.json({ success: true, transaction: removed });
  } catch (error) {
    if (error.message === "Transaction not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
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
