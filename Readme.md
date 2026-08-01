# MarketMind (Lite)

An AI bookkeeping assistant for Nigerian market traders — helping market women, street vendors, kiosk operators, and other informal business owners track sales, expenses, and debts by simply *talking* to their phone, instead of typing or learning accounting.

> **Note:** This is a **lighter, simplified rebuild** of the original MarketMind hackathon project. The original version (built with Python/FastAPI, RAG, ChromaDB, and vector embeddings) proved harder to maintain and reason about for a small team. 

---

## The problem

Millions of traders in Nigeria's informal economy don't keep records — not because they don't care, but because bookkeeping is difficult, existing tools (spreadsheets, POS software) are too complicated, need internet, or require typing skills many traders don't have or want to use in the middle of a busy market day.

## The solution

Speak naturally. MarketMind listens, understands, and records.

> "I buy pepper five thousand."
> → Recorded as an expense.
>
> "I sell rice ten thousand."
> → Recorded as a sale.
>
> "How much profit I make today?"
> → MarketMind tells you, in plain language.

No accounts. No passwords. No cloud dependency for core bookkeeping. Just talk, and let the numbers take care of themselves.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Express (Node.js) |
| AI | Google AI Studio — Gemma 4 (`gemma-4-26b-a4b-it`), via `@google/generative-ai` |
| Database | SQLite (`better-sqlite3`) |
| Frontend | React Native (Expo) |

This is intentionally a simpler stack than the original hackathon build (no RAG, no vector database, no local LLM serving) — chosen for maintainability by a small team, and closer alignment with the original MVP's philosophy: *"That's enough."*

---

## Core features

### 🎙 Natural language transaction logging
Speak or type a transaction ("I buy pepper five thousand") and Gemma extracts structured data (`type`, `item`, `amount`) automatically, saved straight to SQLite.

### 📊 Daily summary
Sales, expenses, and profit — calculated instantly from logged transactions.

### 💳 Debt tracking
Track customers who buy on credit. Debts can be paid off in installments — each partial payment is immediately logged as a real sale the moment it's received, so your daily totals always reflect actual cash in hand.

### 🗣 Ask Gemma *(planned)*
Ask natural questions like *"How much profit I make today?"* or *"Wetin I spend pass?"* and get a plain-language answer — ideally in Nigerian Pidgin, the trader's language of choice.

---

## Project structure

```
MarketMind_02/
├── server.js          # Express app, routes
├── db.js              # SQLite setup, transaction & debt logic
├── tests/
│   └── debt.test.js   # Automated tests for debt tracking
├── .env                # GOOGLE_API_KEY, PORT (not committed)
└── (frontend — in progress)
```

---

## API overview

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/parse` | Send a trader's message, get structured transaction data back (auto-saved if valid) |
| `GET` | `/summary` | Today's sales, expenses, and profit |
| `POST` | `/debts` | Create a new debt (`debtorName`, `item`, `amount`) |
| `GET` | `/debts` | List unpaid debts (add `?includeAll=true` for all debts) |
| `POST` | `/debts/:id/pay` | Record a payment against a debt (`amount`) |

---

## Design principles (from the original MVP)

- **Voice-first** — traders shouldn't need to type
- **Offline-first where possible** — internet only for AI calls, not for viewing your own data
- **No accounts** — no signup, no OTP, no passwords. Just a name and a language.
- **Simple, not clever** — the AI should disappear into the experience. A trader shouldn't feel like they're "using AI" — just talking to their phone.

---

### Known gaps / not yet implemented
- Voice input (speech-to-text) — decision pending on approach (local Whisper vs. paid cloud STT)
- Onboarding & dashboard UI
- "Ask Gemma" conversational Q&A endpoint
- Pidgin-tuned responses
- Deployment (currently local-only)

---

## Why the rebuild?

The original hackathon version used RAG (retrieval-augmented generation) with vector embeddings to give Gemma context about a trader's sales history for advisory questions. It worked, but introduced real complexity — a second AI model just for embeddings, a vector database (ChromaDB), and several hard-to-debug issues (dimension mismatches, deprecated SDKs, Gemma's "thinking mode" breaking JSON parsing).
