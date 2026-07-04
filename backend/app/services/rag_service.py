import os

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import create_retrieval_chain, create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from app.core.config import settings

LEGAL_SYSTEM_PROMPT = (
    "You are a legal AI assistant helping legal professionals with research and "
    "case related questions. Use the retrieved context below to answer accurately, "
    "and use the conversation history to understand follow up questions and "
    "remember details the user already told you (such as their name or the topic "
    "being discussed). If the context does not contain enough information, say so "
    "plainly rather than guessing. Always include a brief reminder that this is not "
    "a substitute for advice from a licensed attorney when the question involves a "
    "specific legal decision.\n\nContext:\n{context}"
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
)


def _load_or_create_vectorstore() -> FAISS:
    index_path = settings.faiss_index_path
    if os.path.exists(os.path.join(index_path, "index.faiss")):
        return FAISS.load_local(
            index_path, _embeddings, allow_dangerous_deserialization=True
        )
    # Empty placeholder index so the app boots even with no documents ingested yet.
    os.makedirs(index_path, exist_ok=True)
    vectorstore = FAISS.from_texts(
        ["Placeholder document. Ingest real legal documents to replace this."],
        _embeddings,
    )
    vectorstore.save_local(index_path)
    return vectorstore


_vectorstore = _load_or_create_vectorstore()


def get_rag_chain():
    retriever = _vectorstore.as_retriever(search_kwargs={"k": 4})

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


def add_documents_to_index(texts: list[str]):
    """Add new legal documents (already split into chunks) to the FAISS index."""
    _vectorstore.add_texts(texts)
    _vectorstore.save_local(settings.faiss_index_path)


def _to_langchain_messages(history: list[dict]):
    """Convert stored {role, content} dicts from MongoDB into LangChain message objects."""
    messages = []
    for m in history:
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            messages.append(AIMessage(content=m["content"]))
    return messages


async def ask_legal_question(question: str, history: list[dict] | None = None) -> str:
    chain = get_rag_chain()
    chat_history = _to_langchain_messages(history or [])
    result = chain.invoke({"input": question, "chat_history": chat_history})
    return result["answer"]
