"""
LegalX AI Knowledge Centre — FastAPI Backend
Main application entry point with lazy vector-store loading and CORS configuration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ensure_directories, OPENAI_API_KEY, TOPICS
from routers.audio import router as audio_router
from routers.chat import router as chat_router
from routers.keyinfo import router as keyinfo_router
from routers.search import router as search_router
from routers.summary import router as summary_router
from routers.topics import router as topics_router
from routers.transcribe import router as transcribe_router
from services.rag_service import process_missing_indexes_at_startup

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — sequential disk indexing, lazy in-memory loading
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create directories, then build any missing indexes to disk one PDF
    at a time (with explicit memory cleanup after each). Indexes are loaded into
    memory lazily on first request — never all at once at startup.
    """
    logger.info("LegalX backend starting up...")
    ensure_directories()

    if not OPENAI_API_KEY:
        logger.warning(
            "OPENAI_API_KEY is not set. AI features will fail until you add it to .env"
        )
    else:
        logger.info("Building missing vector indexes (one PDF at a time)...")
        process_missing_indexes_at_startup()
        logger.info(
            "Startup indexing complete. Indexes load into memory on first request."
        )

    yield
    logger.info("LegalX backend shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LegalX AI Knowledge Centre",
    description=(
        "AI-powered legal information platform for Indian law. "
        "Provides summaries, key info extraction, chat, audio, and search "
        "across POCSO, Consumer Protection, IT Act, RTI, and GST."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow React frontend on localhost:5173
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(topics_router)
app.include_router(summary_router)
app.include_router(keyinfo_router)
app.include_router(chat_router)
app.include_router(audio_router)
app.include_router(search_router)
app.include_router(transcribe_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health endpoint for monitoring and frontend loading states.
    Reports service status and which topics are indexed.
    """
    from services.rag_service import get_loaded_topic_ids, is_topic_ready

    indexed_topics = [topic_id for topic_id in TOPICS if is_topic_ready(topic_id)]

    return {
        "status": "healthy",
        "service": "LegalX AI Knowledge Centre",
        "openai_configured": bool(OPENAI_API_KEY),
        "topics_registered": len(TOPICS),
        "topics_indexed": len(indexed_topics),
        "indexed_topics": indexed_topics,
        "topics_loaded_in_memory": get_loaded_topic_ids(),
        "indexing_mode": "lazy_with_sequential_startup",
    }


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --reload --port 8000
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
