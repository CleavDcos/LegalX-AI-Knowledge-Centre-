"""
LLM service for LegalX.
Handles GPT-4o calls for summaries, key info extraction, descriptions, and chat via RAG.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional

from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from config import CACHE_DIR, LLM_MODEL, OPENAI_API_KEY, TOPICS
from services.rag_service import get_sample_chunks_for_topic, get_vector_store

logger = logging.getLogger(__name__)


def _get_llm(temperature: float = 0.3) -> ChatOpenAI:
    """Return configured ChatOpenAI instance."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")
    return ChatOpenAI(
        model=LLM_MODEL,
        temperature=temperature,
        openai_api_key=OPENAI_API_KEY,
    )


def _chunks_to_context(chunks: list[Document]) -> str:
    """Format retrieved chunks into a single context string for the LLM."""
    parts: list[str] = []
    for i, doc in enumerate(chunks, start=1):
        source = doc.metadata.get("source", "unknown")
        parts.append(f"[Chunk {i} | Source: {source}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _cache_path(topic_id: str, cache_type: str) -> Path:
    """Path for cached JSON responses (summary, keyinfo, description)."""
    return CACHE_DIR / f"{topic_id}_{cache_type}.json"


def _read_cache(topic_id: str, cache_type: str) -> Optional[Any]:
    """Read cached data if it exists."""
    path = _cache_path(topic_id, cache_type)
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _write_cache(topic_id: str, cache_type: str, data: Any) -> None:
    """Persist data to cache file."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(topic_id, cache_type)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_topic_description(topic_id: str) -> str:
    """
    Generate a short AI description (max 2 sentences) for a topic from PDF content.
    Cached after first generation.
    """
    cached = _read_cache(topic_id, "description")
    if cached:
        return cached["description"]

    chunks = get_sample_chunks_for_topic(topic_id)
    context = _chunks_to_context(chunks)
    topic_name = TOPICS[topic_id]["name"]

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a legal information assistant for Indian law. "
                "Write clear, accessible descriptions for non-legal users.",
            ),
            (
                "human",
                "Based ONLY on the following excerpts from the {topic_name}, "
                "write a short description of maximum 2 sentences explaining what this law covers "
                "and why it matters to ordinary citizens. Do not use bullet points.\n\n"
                "EXCERPTS:\n{context}",
            ),
        ]
    )

    llm = _get_llm(temperature=0.4)
    response = prompt.invoke({"topic_name": topic_name, "context": context})
    result = llm.invoke(response.to_messages())
    description = result.content.strip()

    _write_cache(topic_id, "description", {"description": description})
    return description


def generate_summary(topic_id: str) -> str:
    """
    Generate a plain-English summary (max 250 words) using RAG-retrieved chunks.
    Result is cached.
    """
    cached = _read_cache(topic_id, "summary")
    if cached:
        return cached["summary"]

    chunks = get_sample_chunks_for_topic(topic_id, k=10)
    context = _chunks_to_context(chunks)
    topic_name = TOPICS[topic_id]["name"]

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a legal information assistant for Indian law. "
                "Summarize laws in plain English for non-legal users. "
                "Maximum 250 words. Use short paragraphs, no bullet points.",
            ),
            (
                "human",
                "Based ONLY on the following excerpts from the {topic_name}, "
                "write a clear plain-English summary suitable for ordinary citizens. "
                "Cover the main purpose, key rights, and important provisions.\n\n"
                "EXCERPTS:\n{context}",
            ),
        ]
    )

    llm = _get_llm(temperature=0.3)
    response = prompt.invoke({"topic_name": topic_name, "context": context})
    result = llm.invoke(response.to_messages())
    summary = result.content.strip()

    _write_cache(topic_id, "summary", {"summary": summary})
    return summary


def generate_key_info(topic_id: str) -> dict[str, list[str]]:
    """
    Extract structured key information as JSON with four arrays.
    Each array has 3-5 bullet points. Result is cached.
    """
    cached = _read_cache(topic_id, "keyinfo")
    if cached:
        return cached

    chunks = get_sample_chunks_for_topic(topic_id, k=12)
    context = _chunks_to_context(chunks)
    topic_name = TOPICS[topic_id]["name"]

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a legal information assistant for Indian law. "
                "Extract structured key information from legal text. "
                "Respond ONLY with valid JSON, no markdown fences.",
            ),
            (
                "human",
                "Based ONLY on the following excerpts from the {topic_name}, "
                "extract key information and return a JSON object with EXACTLY these fields:\n"
                "- key_rights: array of 3-5 strings (key rights citizens have)\n"
                "- important_provisions: array of 3-5 strings (important provisions)\n"
                "- penalties: array of 3-5 strings (penalties and consequences)\n"
                "- who_can_benefit: array of 3-5 strings (who benefits from this law)\n\n"
                "EXCERPTS:\n{context}",
            ),
        ]
    )

    llm = _get_llm(temperature=0.2)
    response = prompt.invoke({"topic_name": topic_name, "context": context})
    result = llm.invoke(response.to_messages())
    raw = result.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[:-3]

    key_info = json.loads(raw)

    required_keys = ["key_rights", "important_provisions", "penalties", "who_can_benefit"]
    for key in required_keys:
        if key not in key_info:
            key_info[key] = []
        if not isinstance(key_info[key], list):
            key_info[key] = [str(key_info[key])]

    _write_cache(topic_id, "keyinfo", key_info)
    return key_info


def chat_with_topic(
    topic_id: str,
    message: str,
    history: list[dict[str, str]],
) -> dict[str, Any]:
    """
    Answer a user question using ConversationalRetrievalChain with FAISS retrieval.
    Returns answer and source references from retrieved chunks.
    """
    llm = _get_llm(temperature=0.3)
    vector_store = get_vector_store(topic_id)
    retriever = vector_store.as_retriever(search_kwargs={"k": 5})

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="answer",
    )

    # Populate memory from provided history (excluding the current message)
    for entry in history:
        role = entry.get("role", "")
        content = entry.get("content", "")
        if role == "user":
            memory.chat_memory.add_user_message(content)
        elif role == "assistant":
            memory.chat_memory.add_ai_message(content)

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True,
        verbose=False,
    )

    result = chain.invoke({"question": message})
    answer = result.get("answer", "")
    source_docs: list[Document] = result.get("source_documents", [])

    sources: list[str] = []
    seen: set[str] = set()
    for doc in source_docs:
        source_file = doc.metadata.get("source", "document")
        chunk_idx = doc.metadata.get("chunk_index", "")
        # Extract page reference from chunk content if present
        page_ref = ""
        content = doc.page_content
        if content.startswith("[Page "):
            page_ref = content.split("]")[0].replace("[Page ", "Page ")
        ref = f"{source_file}"
        if page_ref:
            ref = f"{source_file} — {page_ref}"
        if chunk_idx != "":
            ref = f"{ref} (section {chunk_idx})"
        if ref not in seen:
            seen.add(ref)
            sources.append(ref)

    return {"answer": answer, "sources": sources}
