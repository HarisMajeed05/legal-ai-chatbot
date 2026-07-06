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
- [x] Document ingestion (PDF upload per project, chunked and embedded into FAISS)
- [x] Project-scoped retrieval (one project's documents never leak into another's answers)
- [x] Source citations on every answer, with a clear badge distinguishing document-grounded answers from general knowledge
- [x] Streaming responses
- [x] Message actions (copy, regenerate)
- [x] Dark mode, persisted across sessions
- [x] Real document deletion (FAISS vectors removed, not just the database record)
- [x] Project deletion, including all its chats and documents
- [x] OCR fallback for scanned PDFs (requires extra setup, see below)
- [x] Rate limiting on chat and document upload
- [x] Password reset flow over email (requires SMTP setup, see below)
- [x] PDF export of any chat
- [x] Shared projects, invite collaborators by email

## OCR setup (optional, only needed for scanned PDFs)

Normal PDFs with a text layer work without any of this. OCR only kicks in
when a PDF has no extractable text at all, usually a scanned document.

1. Install the Python packages, already listed in requirements/environment:
   `pytesseract`, `pdf2image`
2. Install Tesseract OCR (a system binary, not a Python package):
   Windows: download the installer from the UB Mannheim Tesseract build,
   add its install folder to your PATH.
3. Install Poppler (needed by pdf2image to render PDF pages as images):
   Windows: download a Poppler release, add its `bin` folder to your PATH.

If either is missing, uploading a scanned PDF fails with a clear message
rather than crashing the app, normal text-based PDFs are unaffected either way.

## Email setup (optional, only needed for password reset)

Password reset needs an SMTP relay to actually send the email. Without this
configured, the forgot-password endpoint still runs safely, it just logs the
failure server-side instead of sending anything, and always returns the same
generic message to the frontend either way.

Fill in these in your `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your_email@gmail.com
```
For Gmail specifically, this needs an App Password, not your normal account
password, generated from your Google Account security settings. Any other
SMTP relay, SendGrid, Mailgun, works the same way with their own credentials.
