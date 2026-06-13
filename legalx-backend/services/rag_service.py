"""
RAG (Retrieval-Augmented Generation) service.
Manages FAISS vector stores per topic with lazy loading, embedding, and retrieval.
Vector stores are built on first access (not at startup) and cached in memory.
"""

import gc
import logging
import threading
from pathlib import Path

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
# Per-topic locks to prevent duplicate builds on concurrent first requests
_build_locks: dict[str, threading.Lock] = {}


def _release_memory(*objects: object) -> None:
    """Delete references to large objects and run garbage collection."""
    for obj in objects:
        del obj
    gc.collect()


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
    _persist_vector_store(topic_id, store)
    _vector_stores[topic_id] = store


def _persist_vector_store(topic_id: str, store: FAISS) -> None:
    """Write a FAISS index to disk without updating the in-memory cache."""
    path = _vector_store_path(topic_id)
    path.mkdir(parents=True, exist_ok=True)
    store.save_local(str(path))
    logger.info("Saved FAISS index for topic '%s' to %s", topic_id, path)


def load_vector_store(topic_id: str) -> FAISS:
    """
    Load a topic's FAISS index from disk into the in-memory cache.
    Raises KeyError if no persisted index exists.
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


def ensure_vector_store(topic_id: str) -> FAISS:
    """
    Lazily load or build a topic's FAISS index on first access.
    Order: memory cache -> disk -> build from PDF.
    Subsequent calls return the cached in-memory store.
    """
    if topic_id not in TOPICS:
        raise KeyError(f"Unknown topic: {topic_id}")

    if topic_id in _vector_stores:
        return _vector_stores[topic_id]

    lock = _build_locks.setdefault(topic_id, threading.Lock())
    with lock:
        if topic_id in _vector_stores:
            return _vector_stores[topic_id]

        ensure_directories()

        if vector_store_exists(topic_id):
            return load_vector_store(topic_id)

        logger.info("Lazily building vector store for topic '%s'", topic_id)
        store = build_vector_store_for_topic(topic_id, keep_in_memory=True)
        if store is None:
            raise RuntimeError(f"Failed to build vector store for topic '{topic_id}'")
        return store


def get_vector_store(topic_id: str) -> FAISS:
    """Get vector store for a topic, loading or building on demand."""
    return ensure_vector_store(topic_id)


def build_vector_store_for_topic(topic_id: str, *, keep_in_memory: bool = True) -> FAISS | None:
    """
    Build a new FAISS index from the topic's PDF: chunk, embed, and persist.
    When keep_in_memory is False, the index is saved to disk only and large
    intermediate objects are freed immediately (for low-memory startup builds).
    """
    topic_meta = TOPICS.get(topic_id)
    if not topic_meta:
        raise KeyError(f"Unknown topic: {topic_id}")

    documents = load_and_chunk_pdf(topic_id, topic_meta["pdf"])
    embeddings = _get_embeddings()
    store = FAISS.from_documents(documents, embeddings)
    _release_memory(documents)

    _persist_vector_store(topic_id, store)

    if keep_in_memory:
        _vector_stores[topic_id] = store
        _release_memory(embeddings)
        return store

    _release_memory(store, embeddings)
    logger.info("Released memory after building index for topic '%s'", topic_id)
    return None


def process_missing_indexes_at_startup() -> None:
    """
    Build any missing on-disk indexes one PDF at a time at startup.
    Does not load indexes into memory — only persists to disk and frees RAM
    after each topic to stay within low-memory server limits.
    """
    ensure_directories()

    for topic_id in TOPICS:
        if vector_store_exists(topic_id):
            logger.info("Vector store already on disk for '%s', skipping", topic_id)
            continue

        try:
            logger.info("Startup: building vector store for '%s'...", topic_id)
            build_vector_store_for_topic(topic_id, keep_in_memory=False)
        except FileNotFoundError as exc:
            logger.warning("Startup: skipping topic '%s': %s", topic_id, exc)
        except Exception as exc:
            logger.error("Startup: failed to build topic '%s': %s", topic_id, exc)
        finally:
            _release_memory()


def is_topic_ready(topic_id: str) -> bool:
    """True if the topic is indexed on disk or already loaded in memory."""
    return topic_id in _vector_stores or vector_store_exists(topic_id)


def get_loaded_topic_ids() -> list[str]:
    """Return topic IDs currently held in the in-memory cache."""
    return list(_vector_stores.keys())


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
    Search across topic FAISS indexes and return top results globally.
    Each topic is loaded or built lazily on first search; results are merged
    and ranked by relevance score.
    """
    all_results: list[dict] = []

    for topic_id, meta in TOPICS.items():
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
        except FileNotFoundError as exc:
            logger.warning("Skipping topic '%s' in search: %s", topic_id, exc)
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
