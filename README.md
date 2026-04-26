# NeuralQuery

NeuralQuery is a React + FastAPI knowledge base app with Gemini-powered semantic search. It shares MongoDB auth and article data with the related `knowledge-vault` project, so both apps can work against the same `users` and `articles` collections.

## Features

- JWT auth with register/login flows
- Shared MongoDB user schema compatible with `knowledge-vault`
- Knowledge base article listing, creation, and deletion
- Visibility-aware articles: public for everyone, private only for the author
- Gemini-powered search with state transitions, tool logs, and metrics
- Anonymous free-search limit before sign-in is required
- Responsive UI with mobile header profile and tablet/laptop sidebar account card

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query, wouter
- Backend: FastAPI, Uvicorn, Pydantic
- Database: MongoDB Atlas via Motor
- AI: `google-generativeai`

## Project Structure

```text
knowledgeBase/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |   |-- auth.tsx
|   |   |   |-- knowledge-base.tsx
|   |   |   `-- search.tsx
|-- server_py/
|   |-- main.py
|   |-- routes.py
|   |-- agent.py
|   |-- storage.py
|   |-- db.py
|   `-- schemas.py
|-- shared/
|   |-- schema.ts
|   `-- routes.ts
|-- package.json
`-- .env.example
```

## Prerequisites

- Node.js 18+
- npm
- Python 3.13 recommended
- MongoDB Atlas database
- Gemini API key

## Setup

Install dependencies:

```powershell
npm install
python -m venv venv
.\venv\Scripts\activate
pip install -r server_py/requirements.txt
```

Create `.env`:

```env
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
DB_NAME=test
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=your-jwt-secret
PORT=5000
```

Notes:

- `DB_NAME=test` is the shared database used with `knowledge-vault`
- `JWT_SECRET` should match the other app if you want both apps to honor the same tokens

## Run

```powershell
npm run dev
```

Dev URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

Vite proxies `/api` to the FastAPI backend automatically.

## Scripts

- `npm run dev` - run frontend and backend together
- `npm run dev:frontend` - run Vite only
- `npm run dev:backend` - run FastAPI only
- `npm run build` - build the frontend
- `npm run start` - run FastAPI without reload

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB Atlas SRV connection string |
| `DB_NAME` | No | Database name, defaults to `knowledge-vault` |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `JWT_SECRET` | No | Secret used for JWT signing |
| `PORT` | No | Backend port, default `5000` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

## API

### Auth

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

The backend uses shared user documents with fields like:

- `username`
- `email`
- `hashedPassword`
- `isAdmin`
- `isBanned`
- `createdAt`

### Articles

- `GET /api/health`
- `GET /api/articles`
- `POST /api/articles` - admin only
- `DELETE /api/articles/:id` - admin only

Article visibility:

- anonymous users see public or legacy authorless articles
- authenticated users also see their own private articles

### Agent

- `POST /api/agent/search`
- `POST /api/agent/evaluate`
- `GET /api/agent/logs`

Example search body:

```json
{
  "query": "What are our observability requirements?",
  "seed": 42
}
```

## Rate Limits

- `GET /api/articles` - `30/minute`
- `POST /api/articles` - `10/minute`
- `DELETE /api/articles/:id` - `10/minute`
- `POST /api/agent/search` - `10/minute`
- `POST /api/agent/evaluate` - `2/minute`
- `GET /api/agent/logs` - `20/minute`

Anonymous users also have a free-search cap of 4 searches before login is required.

## Agent Notes

The search pipeline:

1. receive and sanitize the query
2. fetch visible articles from MongoDB
3. rank them with Gemini
4. return metrics, state transitions, tool calls, and logs

Current guardrails:

- max step limit
- tool allowlist
- timeout per tool call
- malformed JSON fallback
- retry with backoff for transient Gemini failures

## Troubleshooting

| Issue | Likely cause | Fix |
| --- | --- | --- |
| `NameError` or backend import failure | outdated backend process | restart `npm run dev` |
| `401` on `/api/auth/me` | missing or expired token | log in again |
| `403 FREE_LIMIT_REACHED` | anonymous search cap hit | sign in |
| `DATABASE_URL must be set` | env missing | add it to `.env` |
| private article not visible | article belongs to another user | sign in as the author |

## Notes About `scratch/`

The `scratch/` folder is for local helper scripts and debugging utilities. It is not required for app runtime.
