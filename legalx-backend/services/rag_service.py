"""
RAG (Retrieval-Augmented Generation) service.
Manages FAISS vector stores per topic, embedding, retrieval, and startup indexing.
"""

import logging
from pathlib import Path
from typing import Optional

from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

from config import (
    EMBEDDING_MODEL,
    OPENAI_API_KEY,
    TOPICS,
    VECTOR_STORE_DIR,
    ensure_directories,
)
from services.pdf_loader import load_and_chunk_pdf

logger = logging.getLogger(__name__)

# In-memory cache of loaded FAISS indexes keyed by topic_id
_vector_stores: dict[str, FAISS] = {}


def _get_embeddings() -> OpenAIEmbeddings:
    """Return configured OpenAI embeddings instance."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")
    return OpenAIEmbeddings(model=EMBEDDING_MODEL, openai_api_key=OPENAI_API_KEY)


def _vector_store_path(topic_id: str) -> Path:
    """Path where a topic's FAISS index is persisted."""
    return VECTOR_STORE_DIR / topic_id


def vector_store_exists(topic_id: str) -> bool:
    """Check if a persisted FAISS index exists for the given topic."""
    path = _vector_store_path(topic_id)
    return path.exists() and (path / "index.faiss").exists()


def save_vector_store(topic_id: str, store: FAISS) -> None:
    """Persist a FAISS index to disk and cache it in memory."""
    path = _vector_store_path(topic_id)
    path.mkdir(parents=True, exist_ok=True)
    store.save_local(str(path))
    _vector_stores[topic_id] = store
    logger.info("Saved FAISS index for topic '%s' to %s", topic_id, path)


def load_vector_store(topic_id: str) -> FAISS:
    """
    Load a topic's FAISS index from disk (or memory cache).
    Raises KeyError if the index does not exist.
    """
    if topic_id in _vector_stores:
        return _vector_stores[topic_id]

    path = _vector_store_path(topic_id)
    if not vector_store_exists(topic_id):
        raise KeyError(f"No vector store found for topic '{topic_id}'")

    embeddings = _get_embeddings()
    store = FAISS.load_local(
        str(path),
        embeddings,
        allow_dangerous_deserialization=True,
    )
    _vector_stores[topic_id] = store
    logger.info("Loaded FAISS index for topic '%s' from disk", topic_id)
    return store


def get_vector_store(topic_id: str) -> FAISS:
    """Get vector store for a topic, loading from disk if needed."""
    return load_vector_store(topic_id)


def build_vector_store_for_topic(topic_id: str) -> FAISS:
    """
    Build a new FAISS index from the topic's PDF: chunk, embed, and persist.
    """
    topic_meta = TOPICS.get(topic_id)
    if not topic_meta:
        raise KeyError(f"Unknown topic: {topic_id}")

    documents = load_and_chunk_pdf(topic_id, topic_meta["pdf"])
    embeddings = _get_embeddings()
    store = FAISS.from_documents(documents, embeddings)
    save_vector_store(topic_id, store)
    return store


def process_topic_on_startup(topic_id: str) -> None:
    """
    Process a single topic on startup.
    Skips reprocessing if a vector store already exists.
    """
    if vector_store_exists(topic_id):
        logger.info("Vector store exists for '%s', skipping reprocessing", topic_id)
        load_vector_store(topic_id)
        return

    logger.info("Building vector store for topic '%s'", topic_id)
    build_vector_store_for_topic(topic_id)


def process_all_topics_on_startup() -> None:
    """Run the full PDF processing pipeline for all registered topics."""
    ensure_directories()
    for topic_id in TOPICS:
        try:
            process_topic_on_startup(topic_id)
        except FileNotFoundError as exc:
            logger.warning("Skipping topic '%s': %s", topic_id, exc)
        except Exception as exc:
            logger.error("Failed to process topic '%s': %s", topic_id, exc)


def retrieve_chunks(topic_id: str, query: str, k: int = 5) -> list[Document]:
    """Retrieve top-k relevant chunks from a topic's FAISS index."""
    store = get_vector_store(topic_id)
    return store.similarity_search(query, k=k)


def retrieve_chunks_with_scores(
    topic_id: str, query: str, k: int = 5
) -> list[tuple[Document, float]]:
    """Retrieve top-k chunks with similarity scores (lower score = more similar for L2)."""
    store = get_vector_store(topic_id)
    return store.similarity_search_with_score(query, k=k)


def search_all_topics(query: str, k: int = 5) -> list[dict]:
    """
    Search across all topic FAISS indexes and return top results globally.
    Merges results from each topic and ranks by relevance score.
    """
    all_results: list[dict] = []

    for topic_id, meta in TOPICS.items():
        if not vector_store_exists(topic_id):
            continue
        try:
            scored = retrieve_chunks_with_scores(topic_id, query, k=k)
            for doc, score in scored:
                all_results.append(
                    {
                        "topic_id": topic_id,
                        "topic_name": meta["name"],
                        "relevant_excerpt": doc.page_content[:500],
                        "relevance_score": round(float(score), 4),
                        "metadata": doc.metadata,
                    }
                )
        except Exception as exc:
            logger.warning("Search failed for topic '%s': %s", topic_id, exc)

    # Lower FAISS L2 distance means more similar — sort ascending
    all_results.sort(key=lambda x: x["relevance_score"])
    return all_results[:k]


def get_sample_chunks_for_topic(topic_id: str, k: int = 8) -> list[Document]:
    """
    Retrieve representative chunks for summary/description generation.
    Uses a broad query derived from the topic name.
    """
    meta = TOPICS[topic_id]
    query = f"overview key provisions rights penalties {meta['name']}"
    return retrieve_chunks(topic_id, query, k=k)
