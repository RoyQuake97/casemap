# Case Map — Lebanese Legal AI Assistant

An AI-powered legal research tool for Lebanese law. Ask questions in Arabic or English and receive cited answers grounded in Lebanese legislation, court decisions, and legal codes.

## Features

- **RAG-based legal Q&A** — answers grounded in 291 laws and 3,408 searchable chunks
- **79 court decisions** across 8 legal categories
- **Comprehensive legal database** — Code of Obligations & Contracts, Penal Code, Commercial Code, Criminal Procedure, Labour Code, Consumer Protection, Copyright, Trademarks, Banking Secrecy, Anti-Money Laundering, E-Transactions, and more
- **Sources panel** — every answer cites its legal sources with article numbers
- **Freemium model** — 1 free question per account, then paywall

## Tech Stack

- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: Express.js
- **AI Model**: Gemini 3 Flash (via OpenAI SDK)
- **Search**: Hybrid keyword + synonym + category search with case law detection

## Getting Started

```bash
npm install
npm run dev
```

## Legal Disclaimer

Not legal advice. For informational use by legal professionals.
