"""
RAG (Retrieval-Augmented Generation) service.
Manages FAISS vector stores per topic with lazy loading, embedding, and retrieval.
Vector stores are built on first access (not at startup) and cached in memory.
"""

import gc
import logging
import threading
from collections import deque
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
# Per-topic locks to prevent duplicate builds on concurrent first requests
_build_locks: dict[str, threading.Lock] = {}
# Track recently accessed topic IDs (for search prioritization)
# Maintains up to 3 most recently accessed topics
_recent_topics: deque = deque(maxlen=3)
_recent_topics_lock = threading.Lock()


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
    1. Return from in-memory cache if already loaded.
    2. Load from disk if index.faiss exists.
    3. Otherwise build from PDF, save to disk, and cache in memory.

    A per-topic threading lock ensures concurrent requests for the same topic
    only trigger one build.
    """
    if topic_id not in TOPICS:
        raise KeyError(f"Unknown topic: {topic_id}")

    if topic_id in _vector_stores:
        return _vector_stores[topic_id]

    lock = _build_locks.setdefault(topic_id, threading.Lock())
    with lock:
        # Re-check after acquiring lock (another thread may have finished)
        if topic_id in _vector_stores:
            return _vector_stores[topic_id]

        ensure_directories()

        if vector_store_exists(topic_id):
            return load_vector_store(topic_id)

        logger.info("Lazily building vector store for topic '%s'", topic_id)
        return build_vector_store_for_topic(topic_id)


def get_vector_store(topic_id: str) -> FAISS:
    """Get vector store for a topic, loading or building on demand."""
    return ensure_vector_store(topic_id)


def build_vector_store_for_topic(topic_id: str) -> FAISS:
    """Build a FAISS index from the topic PDF, persist to disk, and cache in memory."""
    topic_meta = TOPICS.get(topic_id)
    if not topic_meta:
        raise KeyError(f"Unknown topic: {topic_id}")

    documents = load_and_chunk_pdf(topic_id, topic_meta["pdf"])
    embeddings = _get_embeddings()
    store = FAISS.from_documents(documents, embeddings)
    _release_memory(documents)

    save_vector_store(topic_id, store)
    _release_memory(embeddings)
    return store


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


def _load_vector_store_uncached(topic_id: str) -> FAISS:
    """
    Load a FAISS index from disk without caching.
    Used for sequential searching to minimize memory footprint.
    Raises KeyError if no persisted index exists.
    """
    path = _vector_store_path(topic_id)
    if not vector_store_exists(topic_id):
        raise KeyError(f"No vector store found for topic '{topic_id}'")

    embeddings = _get_embeddings()
    store = FAISS.load_local(
        str(path),
        embeddings,
        allow_dangerous_deserialization=True,
    )
    return store


def _record_topic_access(topic_id: str) -> None:
    """Record that a topic was accessed, updating the recent topics list."""
    with _recent_topics_lock:
        # Remove if already present to move it to the end (most recent)
        if topic_id in _recent_topics:
            _recent_topics.remove(topic_id)
        _recent_topics.append(topic_id)


def _get_default_search_topics() -> list[str]:
    """
    Get the default list of topics to search (up to 3).
    Prioritizes: most recently accessed topics that have indexes built.
    Falls back to first available built indexes if no recent access.
    """
    with _recent_topics_lock:
        recent_list = list(_recent_topics)  # Get snapshot of recent topics

    # Collect available topics with built indexes
    available_topics = [
        topic_id
        for topic_id in TOPICS.keys()
        if vector_store_exists(topic_id)
    ]

    if not available_topics:
        logger.warning("No built topic indexes available for search")
        return []

    # Start with most recently accessed that have built indexes, up to 3
    default_topics = [t for t in reversed(recent_list) if t in available_topics][
        :3
    ]

    # If fewer than 2 recent topics, fill with other available topics
    if len(default_topics) < 2:
        other_topics = [t for t in available_topics if t not in default_topics]
        default_topics.extend(other_topics[: 2 - len(default_topics)])

    return default_topics[:3]  # Limit to 3 maximum


def search_all_topics(
    query: str, k: int = 5, topics: Optional[list[str]] = None
) -> list[dict]:
    """
    Search across topic FAISS indexes sequentially, one at a time.
    Processes topics sequentially to minimize memory usage:
    1. Load a topic's FAISS index from disk (uncached)
    2. Perform the similarity search
    3. Extract results
    4. Delete the index object and call gc.collect()
    5. Repeat for next topic

    Args:
        query: Search query string.
        k: Maximum number of results to return.
        topics: Optional list of topic IDs to search. If None, searches up to 3
                most recently accessed topics (or first available if none accessed).
                Searches are limited to 2-3 topics maximum to minimize memory usage.

    Only searches indexes that already exist on disk; skips topics with missing
    vector stores. Returns top-k results globally ranked by relevance score.
    """
    # Determine which topics to search
    if topics is None:
        topics_to_search = _get_default_search_topics()
        logger.debug(
            "Using default topic selection (2-3 most recent/available): %s",
            topics_to_search,
        )
    else:
        # Limit to 3 topics maximum
        topics_to_search = topics[:3]
        logger.debug("Searching user-specified topics: %s", topics_to_search)

    if not topics_to_search:
        logger.warning(
            "No topics available to search. Ensure vector stores are built first."
        )
        return []

    all_results: list[dict] = []

    for topic_id in topics_to_search:
        # Validate topic exists
        if topic_id not in TOPICS:
            logger.warning("Unknown topic '%s': skipping", topic_id)
            continue

        meta = TOPICS[topic_id]

        # Skip topics whose vector store hasn't been built yet
        if not vector_store_exists(topic_id):
            logger.warning(
                "Skipping topic '%s' (%s): vector store not yet built on disk",
                topic_id,
                meta["name"],
            )
            continue

        store = None
        try:
            # Load FAISS index (uncached) for this topic only
            logger.debug("Loading vector store for topic '%s' to search", topic_id)
            store = _load_vector_store_uncached(topic_id)

            # Record topic access for future default selection
            _record_topic_access(topic_id)

            # Perform similarity search
            scored = store.similarity_search_with_score(query, k=k)

            # Extract results while store is still in memory
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

            logger.debug(
                "Searched topic '%s': extracted %d results",
                topic_id,
                len(scored),
            )
        except Exception as exc:
            logger.warning("Search failed for topic '%s': %s", topic_id, exc)
        finally:
            # Explicitly release the FAISS index and run garbage collection
            # to ensure only one index is held in memory at a time
            if store is not None:
                _release_memory(store)
                logger.debug(
                    "Released vector store for topic '%s' from memory", topic_id
                )

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
