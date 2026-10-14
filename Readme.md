# Legal AI Chatbot

A legal assistant with a React frontend and a FastAPI backend. Answers come from a RAG pipeline (LangChain and FAISS) over documents you upload to a project, and the LLM is hosted on Groq.

The chat model runs on Groq's servers, so the backend does not need a GPU. Only the small embedding model runs locally, on CPU.

## Features

- Sign up and log in with JWT
- Projects (for example cases or clients), each with its own chats and documents
- PDF upload, split into chunks and stored in FAISS
- Retrieval stays inside one project, so documents from one project never show up in another
- Source citations, with a badge that separates answers from your documents and general knowledge answers
- Conversation memory, streaming replies, copy and regenerate
- OCR for scanned PDFs (optional setup)
- Deleting a document removes its vectors from FAISS. Deleting a project removes its chats and documents.
- Rate limits on chat and document upload
- Password reset by email (optional setup)
- Export a chat to PDF
- Share a project with collaborators by email
- Dark mode

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI |
| Database | MongoDB |
| RAG | LangChain and FAISS |
| LLM | Groq API (default `openai/gpt-oss-120b`) |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`), local on CPU |
| Environment | Conda (`environment.yml`). `requirements.txt` works for pip. |

## Project structure

```
backend/
  app/
    api/        auth, chat, documents, projects
    core/       settings, email, rate limit, security
    db/         MongoDB connection
    models/     Pydantic schemas
    services/   RAG pipeline (FAISS and Groq)
    main.py
  environment.yml
  requirements.txt
frontend/
  src/
    api/ components/ context/ pages/
    App.jsx  main.jsx
  package.json
```

## Setup

### 1. Groq API key

Create a free account at [console.groq.com](https://console.groq.com) and make an API key.

### 2. Backend

```bash
cd backend
conda env create -f environment.yml
conda activate legal-ai-backend
```

Create a file named `.env` in `backend/`:

```
GROQ_API_KEY=your_key
JWT_SECRET_KEY=a_long_random_string
GROQ_MODEL=openai/gpt-oss-120b
MONGODB_URI=mongodb://localhost:27017
```

`MONGODB_URI` defaults to a local MongoDB, so you can leave it out if MongoDB runs on your machine. Start MongoDB, then run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/api/health. It should return `{"status": "ok"}`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Changing the model

Set `GROQ_MODEL` in `.env`. Groq retires models from time to time, so check the [supported models page](https://console.groq.com/docs/models) for current IDs. At the time of writing, `openai/gpt-oss-120b`, `openai/gpt-oss-20b` and `qwen/qwen3.6-27b` are listed as replacements for the retired Llama 3 models.

## Other settings

These can also go in `.env`: `MONGODB_DB_NAME`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FAISS_INDEX_PATH`, `EMBEDDING_MODEL` and `FRONTEND_ORIGIN`.

## OCR (optional, for scanned PDFs)

PDFs with a text layer work without this. OCR runs only when a PDF has no extractable text.

1. The Python packages `pytesseract` and `pdf2image` are already in the requirements.
2. Install Tesseract OCR. On Windows, use the UB Mannheim build and add its folder to your PATH.
3. Install Poppler, which `pdf2image` needs to render pages. On Windows, download a release and add its `bin` folder to your PATH.

If either tool is missing, uploading a scanned PDF fails with a clear message. Normal PDFs are not affected.

## Email (optional, for password reset)

Add these to `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your_email@gmail.com
```

For Gmail, use an App Password from your Google Account security settings, not your normal password. Other SMTP services such as SendGrid or Mailgun work the same way.

Without SMTP settings, the forgot password endpoint still works safely. It logs the failure on the server and returns the same generic message.
