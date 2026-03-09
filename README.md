# NeuralQuery — AI-Powered Knowledge Base Agent

An intelligent knowledge base management system with an AI agent that retrieves, ranks, and explains the most relevant documents using **Google Gemini 2.5 Flash Lite**. Built with a **React** frontend and **Python/FastAPI** backend, backed by **MongoDB Atlas**.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Agent Pipeline](#agent-pipeline)
- [Agentic Engineering Features](#agentic-engineering-features)
- [Evaluation Harness](#evaluation-harness)
- [Production Build](#production-build)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Knowledge Base CRUD** — Create, read, and delete articles with rich metadata
- **AI-Powered Semantic Search** — Natural language queries ranked by Google Gemini
- **Agent State Machine** — Deterministic state transitions (IDLE → RECEIVING_QUERY → FETCHING_ARTICLES → RANKING → RESPONDING → DONE/ERROR)
- **Full Observability** — Run IDs, structured JSONL logs, timestamped state transitions, tool call I/O recording
- **Reproducibility** — Optional seed parameter for deterministic results (temperature = 0.0)
- **3 Quantitative Metrics** — Retrieval accuracy, query latency, articles scanned
- **Evaluation Harness** — 10 built-in test scenarios with hit/miss tracking
- **Guardrails** — Max step limit (10), tool timeout (30s), tool allowlist enforcement
- **Polished UI** — Responsive React interface with animations, dark/light theme, and real-time agent feedback

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  (Vite + TailwindCSS + shadcn/ui + Framer Motion)        │
│                                                          │
│  Pages: Knowledge Base (CRUD) │ Search (Agent UI)        │
│  Hooks: useArticles, useAgentSearch, useEvaluate         │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP (fetch) — proxied by Vite in dev
                   ▼
┌──────────────────────────────────────────────────────────┐
│               FastAPI (Python) Backend                    │
│                                                          │
│  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │ Articles API │  │        Agent Pipeline            │   │
│  │  GET / POST  │  │                                  │   │
│  │   DELETE     │  │  1. State Machine (7 states)     │   │
│  └──────┬───────┘  │  2. Tool: json_store_search      │   │
│         │          │  3. Tool: llm_rank (Gemini API)   │   │
│         │          │  4. Metrics + Logs + Response     │   │
│         │          └──────────────┬───────────────────┘   │
│         │                        │                        │
│         ▼                        ▼                        │
│  ┌───────────────────────────────────────────────────┐   │
│  │          Motor (async PyMongo) Storage Layer       │   │
│  └───────────────────────┬───────────────────────────┘   │
└──────────────────────────┼───────────────────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │   MongoDB Atlas     │
                │   (Cloud Database)  │
                └─────────────────────┘
```

---

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| **Frontend** | React 18, TypeScript, Vite 7, TailwindCSS 3       |
| **UI Kit**   | shadcn/ui (Radix primitives), Lucide icons         |
| **Animations** | Framer Motion                                   |
| **Routing**  | wouter                                             |
| **Data Fetching** | TanStack React Query v5                       |
| **Backend**  | Python 3.11, FastAPI, Uvicorn                      |
| **Database** | MongoDB Atlas (Motor — async PyMongo)               |
| **AI Model** | Google Gemini 2.5 Flash Lite (`google-generativeai`) |
| **Rate Limiting** | slowapi (IP-based throttling)                   |
| **Validation** | Pydantic (backend), Zod (frontend shared types)  |
| **Build**    | Vite (client)                                      |
| **Runtime**  | Python venv, Uvicorn (ASGI server)                 |

---

## Project Structure

```
Knowledge-Query-Agent/
├── client/                      # React frontend
│   ├── index.html               # Entry HTML
│   ├── src/
│   │   ├── App.tsx              # Router setup
│   │   ├── main.tsx             # React entry point
│   │   ├── index.css            # Global styles
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   │   ├── article-form.tsx # Article creation form
│   │   │   ├── layout.tsx       # Shell layout
│   │   │   └── ui/              # shadcn/ui components (40+)
│   │   ├── hooks/
│   │   │   ├── use-agent.ts     # useAgentSearch, useEvaluate
│   │   │   ├── use-articles.ts  # useArticles, useCreateArticle, useDeleteArticle
│   │   │   ├── use-mobile.tsx   # Responsive breakpoint hook
│   │   │   └── use-toast.ts     # Toast notifications
│   │   ├── lib/
│   │   │   ├── queryClient.ts   # TanStack Query config
│   │   │   └── utils.ts         # cn() utility
│   │   └── pages/
│   │       ├── knowledge-base.tsx  # Articles CRUD page
│   │       ├── search.tsx          # Agent search page (main feature)
│   │       └── not-found.tsx       # 404 page
│   └── public/                  # Static assets
│
├── server_py/                   # Python/FastAPI backend
│   ├── main.py                  # FastAPI app, CORS, lifespan, static serving
│   ├── routes.py                # API routes (articles CRUD + agent + eval + logs)
│   ├── agent.py                 # Agent pipeline, state machine, tools, Gemini, eval harness
│   ├── storage.py               # Data access layer (async CRUD via Motor)
│   ├── db.py                    # MongoDB connection (Motor), auto-increment counter
│   ├── schemas.py               # Pydantic models (Article, SearchRequest, etc.)
│   └── requirements.txt         # Python dependencies
│
├── shared/                      # Shared types (used by frontend)
│   ├── schema.ts                # Zod schemas, TypeScript types, state machine enums
│   └── routes.ts                # Typed API contract (paths, methods, schemas)
│
├── venv/                        # Python virtual environment (gitignored)
├── .env.example                 # Environment variable template
├── package.json                 # Frontend dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── vite.config.ts               # Vite configuration (+ API proxy)
└── postcss.config.js            # PostCSS configuration
```

---

## Prerequisites

- **Python** ≥ 3.11
- **Node.js** ≥ 18.x (for frontend tooling)
- **npm** ≥ 9.x
- **MongoDB Atlas** account (free tier works) — [Create Cluster](https://www.mongodb.com/atlas)
- **Google Gemini API Key** — [Get Key](https://aistudio.google.com/apikey)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd Knowledge-Query-Agent
```

### 2. Install dependencies

```bash
# Frontend dependencies
npm install

# Python virtual environment + backend dependencies
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate      # macOS/Linux
pip install -r server_py/requirements.txt
```

### 3. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
GEMINI_API_KEY=your-gemini-api-key-here
PORT=5000
```

### 4. Start the development server

```bash
npm run dev
```

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:5000 (FastAPI)

Vite proxies `/api` requests to the FastAPI backend automatically.

---

## Environment Variables

| Variable       | Required | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL` | Yes      | MongoDB Atlas connection string (SRV format)     |
| `GEMINI_API_KEY` | Yes    | Google Gemini API key from AI Studio             |
| `PORT`         | No       | Server port (default: `5000`)                    |

---

## Running the Project

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start both frontend (Vite) + backend (FastAPI) concurrently |
| `npm run dev:frontend` | Start Vite dev server only                          |
| `npm run dev:backend`  | Start FastAPI with hot-reload only                  |
| `npm run build`      | Build frontend for production (Vite)                  |
| `npm run start`      | Start FastAPI production server                       |

---

## API Endpoints

### Articles (CRUD)

| Method   | Path                 | Description            | Body                            |
| -------- | -------------------- | ---------------------- | ------------------------------- |
| `GET`    | `/api/articles`      | List all articles      | —                               |
| `POST`   | `/api/articles`      | Create an article      | `{ title, content, metadata? }` |
| `DELETE` | `/api/articles/:id`  | Delete an article by ID| —                               |

### Agent

| Method | Path                  | Description                            | Body                      |
| ------ | --------------------- | -------------------------------------- | ------------------------- |
| `POST` | `/api/agent/search`   | Run AI-powered semantic search         | `{ query, seed? }`        |
| `POST` | `/api/agent/evaluate` | Run evaluation harness (10 scenarios)  | —                         |
| `GET`  | `/api/agent/logs`     | Retrieve all run logs (JSONL)          | —                         |

### Rate Limits

All endpoints are protected by IP-based rate limiting using **slowapi**:

| Endpoint               | Limit         |
| ---------------------- | ------------- |
| `GET /api/articles`    | 30/minute     |
| `POST /api/articles`   | 10/minute     |
| `DELETE /api/articles/:id` | 10/minute |
| `POST /api/agent/search` | 5/minute    |
| `POST /api/agent/evaluate` | 2/minute  |
| `GET /api/agent/logs`  | 20/minute     |

Exceeding the limit returns HTTP `429 Too Many Requests`.

### Search Response Shape

```json
{
  "runId": "uuid",
  "results": [
    {
      "article": { "id": 1, "title": "...", "content": "...", "metadata": {}, "createdAt": "..." },
      "score": 85,
      "explanation": "This article matches because..."
    }
  ],
  "metrics": {
    "retrievalAccuracy": 85,
    "queryTimeMs": 1234,
    "articlesScanned": 15
  },
  "stateTransitions": [
    { "from": "IDLE", "event": "query_received", "to": "RECEIVING_QUERY", "timestamp": "..." }
  ],
  "toolCalls": [
    { "tool": "json_store_search", "input": {}, "output": {}, "durationMs": 45 },
    { "tool": "llm_rank", "input": {}, "output": {}, "durationMs": 1100 }
  ],
  "currentState": "DONE",
  "seed": 42,
  "logs": ["[timestamp] Run started...", "..."]
}
```

---

## Agent Pipeline

Each search request goes through a deterministic, observable pipeline:

```
Step 1 │ IDLE → RECEIVING_QUERY     │ Parse and validate the user query
Step 2 │ → FETCHING_ARTICLES        │ Tool: json_store_search — fetch all articles from MongoDB
Step 3 │ → RANKING                  │ Tool: llm_rank — send articles + query to Gemini for ranking
Step 4 │ → RESPONDING               │ Build response with matched article, score, explanation
Step 5 │ → DONE (or ERROR)          │ Return metrics, transitions, tool calls, logs
```

### Tools Used

| Tool               | Purpose                                   | Timeout |
| ------------------ | ----------------------------------------- | ------- |
| `json_store_search`| Fetch all articles from MongoDB            | 30s     |
| `llm_rank`         | Send query + articles to Gemini for ranking| 30s     |

Both tools are enforced via an allowlist — only `json_store_search` and `llm_rank` are permitted.

---

## Agentic Engineering Features

### 1. State Machine
Seven deterministic states with full transition logging:
`IDLE` → `RECEIVING_QUERY` → `FETCHING_ARTICLES` → `RANKING` → `RESPONDING` → `DONE` | `ERROR`

### 2. Observability
- **Run ID**: Every search gets a unique UUID
- **Structured Logs**: JSONL-format entries with timestamps
- **State Transitions**: Full history with from/to/event/timestamp
- **Tool Call Recording**: Input, output, and duration for every tool

### 3. Reproducibility
- Optional `seed` parameter in search requests
- When seed is provided, Gemini temperature is set to `0.0` for deterministic output

### 4. Metrics (3 quantitative)
- **Retrieval Accuracy**: Gemini's relevance score (0–100)
- **Query Latency**: End-to-end time in milliseconds
- **Articles Scanned**: Total articles processed

### 5. Guardrails
- **Max Steps**: 10 (prevents infinite loops)
- **Tool Timeout**: 30 seconds per tool call (via `asyncio.wait_for`)
- **Tool Allowlist**: Only `json_store_search` and `llm_rank` are permitted
- **Input Validation**: Pydantic models on all API inputs
- **JSON Parse Safety**: Graceful fallback if Gemini returns malformed JSON

### 6. UI Features
- Real-time state transition visualization with color-coded dots
- Run ID and seed display
- 3 metric cards (accuracy, latency, scanned)
- Collapsible tool calls panel showing input/output JSON
- Terminal-style execution logs
- Evaluation harness results with hit/miss indicators

---

## Evaluation Harness

The built-in evaluation harness tests the agent against 10 predefined scenarios:

| # | Query                                        | Expected Keyword |
|---|----------------------------------------------|-----------------|
| 1 | How do I set up the agentic environment?     | setup           |
| 2 | What are the observability requirements?      | observability   |
| 3 | How many metrics do I need?                   | metrics         |
| 4 | What logging format should I use?             | log             |
| 5 | What is a state machine?                      | state           |
| 6 | How do teams proceed week by week?            | workflow        |
| 7 | What tools are recommended for the project?   | stack           |
| 8 | How should I handle configuration and secrets? | setup          |
| 9 | What are the demo expectations?               | metrics         |
| 10| How to show reproducibility?                  | metrics         |

**Run via UI**: Click "Run Eval (10 scenarios)" on the Search page.

**Run via API**:
```bash
curl -X POST http://localhost:5000/api/agent/evaluate
```

**Response** includes per-scenario results and a summary with total hits, accuracy percentage, and average latency.

---

## Production Build

```bash
# Build frontend (Vite)
npm run build

# Start FastAPI production server (serves built frontend too)
npm run start
```

The production build outputs to `dist/public/` — optimized React client assets.
FastAPI serves these static files automatically when the `dist/public/` directory exists.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Port 5000 already in use | Another process occupies the port | `Get-NetTCPConnection -LocalPort 5000 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| `GEMINI_API_KEY must be set` | Missing API key | Add `GEMINI_API_KEY` to your `.env` file |
| `429 Too Many Requests` | Gemini free-tier quota exceeded | Wait for quota reset (daily) or use a new API key |
| `DATABASE_URL must be set` | Missing MongoDB connection string | Add `DATABASE_URL` to your `.env` file |
| Articles missing `id` field | Legacy data predates migration | Handled automatically — server assigns IDs on startup |
| `ModuleNotFoundError` | Venv not activated or deps missing | Activate venv and run `pip install -r server_py/requirements.txt` |

---

## License

MIT
