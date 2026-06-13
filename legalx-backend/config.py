"""
Central configuration for LegalX backend.
Defines topic metadata, paths, and shared constants.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
VECTOR_STORE_DIR = BASE_DIR / "vector_store"
CACHE_DIR = BASE_DIR / "cache"
AUDIO_DIR = BASE_DIR / "audio_output"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4o-mini"
TTS_MODEL = "tts-1"
TTS_VOICE = "nova"

# Topic registry: slug -> metadata and PDF filename
TOPICS: dict[str, dict[str, str]] = {
    "pocso": {
        "name": "Protection of Children from Sexual Offences (POCSO) Act",
        "pdf": "pocso_act.pdf",
        "icon": "🛡️",
    },
    "consumer": {
        "name": "Consumer Protection Act",
        "pdf": "consumer_protection_act.pdf",
        "icon": "🛒",
    },
    "cybercrime": {
        "name": "Information Technology Act, 2000 (Cybercrime)",
        "pdf": "it_act_2000.pdf",
        "icon": "💻",
    },
    "rti": {
        "name": "Right to Information (RTI) Act, 2005",
        "pdf": "rti_act_2005.pdf",
        "icon": "📋",
    },
    "gst": {
        "name": "Goods and Services Tax (GST) Act, 2017",
        "pdf": "gst_act_2017.pdf",
        "icon": "💰",
    },
}


def ensure_directories() -> None:
    """Create required directories if they do not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
