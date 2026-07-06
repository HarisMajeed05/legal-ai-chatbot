import os

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import create_retrieval_chain, create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from app.core.config import settings

LEGAL_SYSTEM_PROMPT = (
    "You are a legal AI assistant helping legal professionals with research and "
    "case related questions. Use the retrieved context below to answer accurately, "
    "and use the conversation history to understand follow up questions and "
    "remember details the user already told you. If the context does not contain "
    "enough information, say so plainly rather than guessing. Always include a "
    "brief reminder that this is not a substitute for advice from a licensed "
    "attorney when the question involves a specific legal decision.\n\n"
    "Context:\n{context}"
)

CONDENSE_QUESTION_PROMPT = (
    "Given the conversation history and the latest user question, rewrite the "
    "question as a standalone question that can be understood without the chat "
    "history, if needed. Do not answer it, only reformulate it if necessary, "
    "otherwise return it unchanged."
)

_embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
_llm = ChatGroq(
    api_key=settings.groq_api_key,
    model=settings.groq_model,
    temperature=0.2,
    streaming=True,
)
_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


def _load_or_create_vectorstore() -> FAISS:
    index_path = settings.faiss_index_path
    if os.path.exists(os.path.join(index_path, "index.faiss")):
        return FAISS.load_local(
            index_path, _embeddings, allow_dangerous_deserialization=True
        )
    os.makedirs(index_path, exist_ok=True)
    vectorstore = FAISS.from_texts(
        ["Placeholder document. Upload real case documents to replace this."],
        _embeddings,
        metadatas=[{"project_id": None, "source": "placeholder"}],
    )
    vectorstore.save_local(index_path)
    return vectorstore


_vectorstore = _load_or_create_vectorstore()


def add_document_to_index(text: str, project_id: str, filename: str) -> tuple[int, list[str]]:
    """Split a document into chunks, add it to the shared FAISS index tagged
    with its project, and return the chunk count plus the FAISS ids so the
    caller can later delete exactly these vectors if the document is removed."""
    chunks = _splitter.split_text(text)
    metadatas = [{"project_id": project_id, "source": filename} for _ in chunks]
    ids = _vectorstore.add_texts(chunks, metadatas=metadatas)
    _vectorstore.save_local(settings.faiss_index_path)
    return len(chunks), ids


def delete_document_from_index(chunk_ids: list[str]):
    """Removes exactly the vectors belonging to one document, not the whole
    index. Fixes the earlier limitation where deleting a document only
    removed its database record but left its chunks searchable forever."""
    if not chunk_ids:
        return
    _vectorstore.delete(chunk_ids)
    _vectorstore.save_local(settings.faiss_index_path)


def _build_retriever(project_id: str | None):
    if project_id:
        # Scope retrieval to this project only, so one case's documents never
        # leak into another project's answers.
        search_kwargs = {"k": 4, "filter": {"project_id": project_id}}
    else:
        search_kwargs = {"k": 4}
    return _vectorstore.as_retriever(search_kwargs=search_kwargs)


def get_rag_chain(project_id: str | None = None):
    retriever = _build_retriever(project_id)

    condense_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", CONDENSE_QUESTION_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(_llm, retriever, condense_prompt)

    answer_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", LEGAL_SYSTEM_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    combine_docs_chain = create_stuff_documents_chain(_llm, answer_prompt)
    return create_retrieval_chain(history_aware_retriever, combine_docs_chain)


def _to_langchain_messages(history: list[dict]):
    messages = []
    for m in history:
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            messages.append(AIMessage(content=m["content"]))
    return messages


def _extract_sources(context_docs) -> list[dict]:
    seen = set()
    sources = []
    for doc in context_docs:
        source = doc.metadata.get("source", "unknown")
        if source in seen or source in ("placeholder", "unknown"):
            continue
        seen.add(source)
        sources.append({"filename": source, "snippet": doc.page_content[:200]})
    return sources


async def ask_legal_question(
    question: str, history: list[dict] | None = None, project_id: str | None = None
) -> dict:
    """Non-streaming path. Returns the answer plus which documents backed it."""
    chain = get_rag_chain(project_id)
    chat_history = _to_langchain_messages(history or [])
    result = chain.invoke({"input": question, "chat_history": chat_history})
    sources = _extract_sources(result.get("context", []))
    return {"answer": result["answer"], "sources": sources}


async def stream_legal_answer(
    question: str, history: list[dict] | None = None, project_id: str | None = None
):
    """Streaming path. Yields answer text chunks as they're generated, then a
    final dict with the full answer and sources once the stream ends."""
    chain = get_rag_chain(project_id)
    chat_history = _to_langchain_messages(history or [])

    full_answer = ""
    sources: list[dict] = []

    async for chunk in chain.astream({"input": question, "chat_history": chat_history}):
        if "answer" in chunk:
            full_answer += chunk["answer"]
            yield {"type": "token", "text": chunk["answer"]}
        if "context" in chunk and not sources:
            sources = _extract_sources(chunk["context"])

    yield {"type": "done", "answer": full_answer, "sources": sources}
