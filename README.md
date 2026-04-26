# NeuralQuery — AI Knowledge Base Agent

NeuralQuery is a production-grade agentic knowledge base system designed for secure, semantic document retrieval. Built with a high-performance **FastAPI** backend and a modern **React** frontend, it utilizes **Google Gemini** to rank and explain search results with human-like reasoning.

---

## 🚀 Key Features

- **Semantic Agentic Search**: Beyond keyword matching. The agent understands context, ranks results by relevance, and provides natural language explanations for its matches.
- **Secure Retrieval Pipeline**: Multi-step agent architecture with strict guardrails to prevent prompt injection and data leakage.
- **Production-Ready Security**: Implements industry-standard headers, rate limiting, and private internal audit logging.
- **Unified Knowledge Ecosystem**: Seamlessly integrates with [Knowledge Vault](https://knowledge-vault.up.railway.app) for document management.
- **Deterministic ID Privacy**: Uses secure, reversible integer mapping for all internal MongoDB ObjectIDs to prevent exposure of database internals.

---

## 🛡️ Security Guardrails (NeuralQuery Standards)

The system adheres to a strict "Secure-by-Design" philosophy:

1.  **Prompt Injection Defense**: All LLM inputs are sanitized via `_sanitize_query()` to strip control characters and malicious manipulation attempts.
2.  **No Internal Leakage**: The API strictly filters out `toolCalls`, execution logs, and database metrics before responding to the public.
3.  **Admin Protection**: Critical endpoints (`/logs`, `/evaluate`) are hardened with an `X-Admin-Key` header requirement.
4.  **Privacy-First IDs**: MongoDB `_id` fields are never exposed. They are mapped to unique integers for all public-facing API responses.
5.  **Strict Serialization**: Every request and response is validated through **Pydantic** models with hard length limits:
    - **Title**: Max 200 chars
    - **Content**: Max 50,000 chars
    - **Search Query**: Max 500 chars

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: TanStack React Query v5
- **Routing**: Wouter

### Backend
- **Framework**: Python 3.11 + FastAPI
- **Database**: MongoDB Atlas (via Motor)
- **AI Engine**: Google Gemini API
- **Security**: JWT (HS256), Bcrypt, SlowAPI (Rate Limiting)

---

## 🚦 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB Atlas Connection String
- Gemini API Key

### Local Installation

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd knowledgeBase
    ```

2.  **Setup Backend**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    pip install -r requirements.txt
    ```

3.  **Setup Frontend**:
    ```bash
    npm install
    ```

4.  **Environment Configuration**:
    Create a `.env` file in the root:
    ```env
    MONGODB_URI=your_mongodb_uri
    JWT_SECRET=your_jwt_secret
    GEMINI_API_KEY=your_gemini_key
    ADMIN_KEY=your_secure_admin_key
    CORS_ORIGINS=http://localhost:5173
    ```

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```

---

## 🚢 Deployment

### Docker (Recommended)
The project includes a multi-stage `Dockerfile` optimized for Render/Cloud Run:
```bash
docker build -t neural-query .
docker run -p 5000:5000 neural-query
```

### Render Deployment
1.  Connect your GitHub repository to Render.
2.  Select the `Web Service` type.
3.  Render will automatically detect the `render.yaml` configuration.
4.  Ensure all Environment Variables are set in the Render Dashboard.

---

## 📝 License
MIT License. Created by [Your Name/Team].
