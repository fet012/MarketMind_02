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

async function parseUserMessage(userId, message, language = "english") {
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
    await logTransaction(userId, parsed.type, parsed.item, parsed.amount);
  }

  return { parsed, raw };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/parse", async (req, res) => {
  const { message, language = "english", userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const { parsed, raw } = await parseUserMessage(userId, message, language);

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
  const userId = req.body?.userId || req.query?.userId;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

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

    const { parsed, raw } = await parseUserMessage(userId, text, language);
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

async function buildAskContext(userId) {
  const summary = await getTodaySummary(userId);
  const salesByItem = await getSalesByItem(userId);
  const expensesByItem = await getExpensesByItem(userId);
  const recentTransactions = await getRecentTransactions(userId, 10);
  const debts = await getDebtSummary(userId);

  return {
    summary,
    salesByItem,
    expensesByItem,
    recentTransactions,
    debts,
  };
}

async function answerQuestion(userId, question, language = "english") {
  const context = await buildAskContext(userId);
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

app.get("/summary", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  res.json(await getTodaySummary(userId));
});

app.post("/ask", async (req, res) => {
  const { question, language = "english", userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const answer = await answerQuestion(userId, question, language);
    res.json({ answer, context: await buildAskContext(userId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/transactions", async (req, res) => {
  const userId = req.query.userId;
  const limit = Number(req.query.limit) || 50;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  res.json(await getTransactionHistory(userId, limit));
});

app.post("/transactions", async (req, res) => {
  try {
    const { type, item, amount, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const transactionId = await logTransaction(userId, type, item, amount);
    res.status(201).json(await getTransactionById(userId, transactionId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/transactions/:id", async (req, res) => {
  const transactionId = Number(req.params.id);
  const { userId, ...fields } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const updated = await updateTransaction(userId, transactionId, fields);
    res.json(updated);
  } catch (error) {
    if (error.message === "Transaction not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

app.delete("/transactions/:id", async (req, res) => {
  const transactionId = Number(req.params.id);
  const userId = req.body?.userId || req.query?.userId;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const removed = await deleteTransaction(userId, transactionId);
    res.json({ success: true, transaction: removed });
  } catch (error) {
    if (error.message === "Transaction not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

app.post("/debts", async (req, res) => {
  const { debtorName, item, amount, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!debtorName || !item || amount === undefined || amount === null) {
    return res
      .status(400)
      .json({ error: "debtorName, item, and amount are required" });
  }

  try {
    const debtId = await createDebt(userId, debtorName, item, Number(amount));
    const debt = await getDebtById(userId, debtId);
    res.status(201).json(debt);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/debts", async (req, res) => {
  const userId = req.query.userId;
  const includeAll = req.query.includeAll === "true";

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  res.json(await getDebts(userId, includeAll));
});

app.post("/debts/:id/pay", async (req, res) => {
  const debtId = Number(req.params.id);
  const { amount, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: "amount is required" });
  }

  try {
    const updatedDebt = await payDebt(userId, debtId, Number(amount));
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