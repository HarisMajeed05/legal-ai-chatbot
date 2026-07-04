# Legal AI Chatbot

Enterprise style Legal AI Assistant. React frontend, FastAPI backend, MongoDB for storage, RAG pipeline using LangChain plus FAISS for retrieval, and a Groq hosted open source LLM for generation.

## Why an API model instead of local deployment

The chat model runs through the Groq API rather than being deployed locally. This means the backend has no GPU requirement at all. It runs identically on a CPU only laptop or a GPU workstation, since the actual model computation happens on Groq's servers. Only the embedding model (used for retrieval, not generation) runs locally, and it is small enough to run comfortably on CPU.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI |
| Database | MongoDB |
| Orchestration | LangChain |
| Vector store | FAISS |
| LLM | Groq API (Llama 3.3 70B by default, swappable) |
| Embeddings | sentence-transformers, local, CPU |
| Environment | Conda (environment.yml), pip/venv also supported via requirements.txt |

## Project structure

```
legal-ai-chatbot/
├── backend/
│   ├── app/
│   │   ├── api/           routes: chat, projects
│   │   ├── core/           settings/config
│   │   ├── db/              MongoDB connection
│   │   ├── models/         pydantic schemas
│   │   ├── services/        RAG pipeline (FAISS plus Groq)
│   │   └── main.py          FastAPI entrypoint
│   ├── data/faiss_index/    vector store files
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

## Setup

### 1. Get a Groq API key

Create a free account at console.groq.com and generate an API key. The free tier is generous enough for development and demo use.

### 2. Backend

```bash
cd backend
conda env create -f environment.yml
conda activate legal-ai-backend

copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

Edit `.env` and set `GROQ_API_KEY` and `JWT_SECRET_KEY`. If MongoDB is running locally, the default `MONGODB_URI` works as is.

Run MongoDB locally (if not already running), then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/api/health`, it should return `{"status": "ok"}`.

`requirements.txt` is kept alongside `environment.yml` as a pip only alternative, in case anyone working on this prefers venv over conda. Either installs the exact same package set.

To export your exact environment for sharing or reproducing elsewhere:

```bash
conda env export --from-history > environment.yml
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Swapping the LLM

`GROQ_MODEL` in `.env` controls which hosted model answers questions. Any Groq supported model works without code changes, examples:

```
llama-3.3-70b-versatile     most capable, default
llama-3.1-8b-instant           fastest, lighter
mixtral-8x7b-32768             alternative architecture
```

## Roadmap

- [x] User authentication (signup/login, JWT, scoped to each user)
- [x] Conversation memory (chat history passed to the model, not just single-turn Q&A)
- [x] Multiple independent chats, grouped under projects (cases/clients)
- [x] Sidebar navigation, project dashboard, login/logout
- [ ] Document ingestion endpoint (PDF upload, chunk, embed into FAISS)
- [ ] Streaming responses instead of a single blocking reply
- [ ] Role-based access for shared projects (multiple members per case)
