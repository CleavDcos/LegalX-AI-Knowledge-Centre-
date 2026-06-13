"""
LegalX AI Knowledge Centre — FastAPI Backend
Main application entry point with startup PDF processing pipeline and CORS configuration.
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
from services.rag_service import process_all_topics_on_startup

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — runs PDF processing pipeline on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: ensure directories exist, then index all PDFs into FAISS vector stores.
    Skips topics whose vector store already exists on disk.
    """
    logger.info("LegalX backend starting up...")
    ensure_directories()

    if not OPENAI_API_KEY:
        logger.warning(
            "OPENAI_API_KEY is not set. AI features will fail until you add it to .env"
        )
    else:
        logger.info("Processing PDFs and building vector stores...")
        process_all_topics_on_startup()
        logger.info("Vector store initialization complete.")

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
    from services.rag_service import vector_store_exists

    indexed_topics = [
        topic_id for topic_id in TOPICS if vector_store_exists(topic_id)
    ]

    return {
        "status": "healthy",
        "service": "LegalX AI Knowledge Centre",
        "openai_configured": bool(OPENAI_API_KEY),
        "topics_registered": len(TOPICS),
        "topics_indexed": len(indexed_topics),
        "indexed_topics": indexed_topics,
    }


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --reload --port 8000
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
