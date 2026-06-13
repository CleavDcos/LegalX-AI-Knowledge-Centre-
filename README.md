# ⚖️ LegalX AI Knowledge Centre

An AI-powered legal information platform that automatically processes Indian legal documents and generates simplified summaries, key information, audio explanations, and answers to legal questions — making the law accessible to every citizen.

**Live Demo:** [legal-x-ai-knowledge-centre-ice3.vercel.app](https://legal-x-ai-knowledge-centre-ice3.vercel.app)  
**Backend API:** [legalx-ai-knowledge-centre.onrender.com](https://legalx-ai-knowledge-centre.onrender.com)  
**GitHub:** [github.com/CleavDcos/LegalX-AI-Knowledge-Centre-](https://github.com/CleavDcos/LegalX-AI-Knowledge-Centre-.git)

---

## 📖 Project Overview

LegalX AI Knowledge Centre is a full-stack AI-powered application built for the LegalX AI/ML Internship Round 2 Assessment. The platform enables ordinary Indian citizens — with no legal background — to understand complex laws through AI-generated summaries, structured key information, audio explanations, and an intelligent Q&A assistant.

The system automatically processes official government legal PDFs through an AI pipeline using Retrieval-Augmented Generation (RAG), eliminating the need for any manual content creation. Every summary, description, and key information card is generated entirely by the AI pipeline from raw legal source documents.

### Supported Legal Topics
- 🛡️ POCSO Act — Protection of Children from Sexual Offences Act, 2012
- 🛒 Consumer Protection Act, 2019
- 💻 Cyber Crime Laws — Information Technology Act, 2000
- 📋 Right to Information (RTI) Act, 2005
- 🧾 GST — Central Goods and Services Tax Act, 2017

---

## 🏗️ Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                  React + Vite Frontend                      │
│         (Vercel — legal-x-ai-knowledge-centre-ice3)         │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│            (Render — legalx-ai-knowledge-centre)           │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PDF Loader  │  │  RAG Service │  │   LLM Service    │  │
│  │ (pdfplumber)│→ │(LangChain +  │→ │  (GPT-4o-mini)   │  │
│  └─────────────┘  │ FAISS Index) │  └──────────────────┘  │
│                   └──────────────┘                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ TTS Service │  │ STT Service  │  │  Cache Layer     │  │
│  │ (OpenAI TTS)│  │  (Whisper)   │  │  (JSON files)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     OpenAI APIs                             │
│    GPT-4o-mini │ text-embedding-3-small │ TTS-1 │ Whisper  │
└─────────────────────────────────────────────────────────────┘
```

### Automation Pipeline

```
Official Government PDF
        ↓
PDF Parsing (pdfplumber)
        ↓
Text Chunking (chunk_size=500, overlap=50)
        ↓
OpenAI Embeddings (text-embedding-3-small)
        ↓
FAISS Vector Store (persisted to disk)
        ↓
RAG Retrieval (top-k relevant chunks)
        ↓
GPT-4o-mini Generation
        ↓
┌───────────────────────────────────┐
│  Summary │ Key Info │ Description │
│  Chat    │ Audio    │ Search      │
└───────────────────────────────────┘
```

---

## 🤖 AI Models Used

| Model | Purpose |
|---|---|
| `gpt-4o-mini` | Summary generation, key info extraction, topic descriptions, chat Q&A |
| `text-embedding-3-small` | Converting legal text chunks into vector embeddings for RAG |
| `tts-1` (voice: nova) | Converting AI-generated summaries to speech audio |
| `whisper-1` | Speech-to-text transcription for voice input in chat |

---

## 🛠️ Technologies Used

### Frontend
- **React 18** + **Vite** — UI framework and build tool
- **React Router v6** — Client-side navigation
- **Axios** — HTTP client for API calls
- **Lucide React** — Icons
- **Plain CSS** — Custom styling with CSS variables

### Backend
- **FastAPI** — Python web framework
- **LangChain** — LLM orchestration and RAG pipeline
- **FAISS** — Vector similarity search (via faiss-cpu)
- **pdfplumber** — PDF text extraction
- **OpenAI Python SDK** — GPT, TTS, Whisper API calls
- **Uvicorn** — ASGI server

### Infrastructure
- **Vercel** — Frontend deployment
- **Render** — Backend deployment
- **GitHub** — Version control and CI/CD

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key

### 1. Clone the Repository
```bash
git clone https://github.com/CleavDcos/LegalX-AI-Knowledge-Centre-.git
cd LegalX-AI-Knowledge-Centre-
```

### 2. Backend Setup
```bash
cd legalx-backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo OPENAI_API_KEY=sk-your-key-here > .env
```

Add the following PDF files to `legalx-backend/data/`:
- `pocso_act.pdf`
- `consumer_protection_act.pdf`
- `it_act_2000.pdf`
- `rti_act_2005.pdf`
- `gst_act_2017.pdf`

```bash
# Start the backend
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`

### 3. Frontend Setup
```bash
cd legalx-frontend-project

# Install dependencies
npm install

# Start the frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🚧 Challenges Faced

**1. Memory constraints on free-tier deployment**
Render's free tier provides only 512MB RAM. Building FAISS vector stores for all 5 legal PDFs simultaneously at startup caused out-of-memory crashes. This was solved by implementing lazy loading — vector stores are built on first request per topic and cached to disk, keeping startup memory usage near zero.

**2. Python version compatibility on Render**
Render defaulted to Python 3.14, which lacked pre-built wheels for `pydantic-core` and required Rust compilation that failed due to a read-only file system. This was resolved by pinning Python to 3.11.9 via a `runtime.txt` file and using package versions with pre-built wheels.

**3. Audio streaming vs JSON response mismatch**
The backend streamed raw MP3 binary data but the frontend was trying to parse it as JSON and extract a URL field. Fixed by configuring Axios with `responseType: 'blob'` and creating an object URL from the binary response directly in the browser.

**4. CORS blocking cross-origin requests**
After deployment, the Vercel frontend could not communicate with the Render backend due to CORS restrictions. Fixed by explicitly adding the Vercel production domain to the FastAPI CORS middleware allowed origins.

**5. PDF filename mismatches**
Two PDFs were saved with incorrect filenames (`posco_act.pdf` instead of `pocso_act.pdf`, `it_act_200.pdf` instead of `it_act_2000.pdf`), causing the RAG pipeline to skip those topics silently and return 503 errors. Fixed by renaming the files to match the expected filenames in `config.py`.

---

## 🔮 Future Improvements

- **Multi-language Support** — Translate summaries and responses into Hindi and other regional Indian languages using translation APIs, making legal information accessible to non-English speakers
- **Authentication & User Profiles** — Allow users to save favourite topics, bookmark Q&A responses, and track their legal learning history
- **Expanded Legal Library** — Add more Indian laws such as IPC, CrPC, Labour Laws, and Environmental Laws with the same automated pipeline
- **Dockerization** — Containerize both frontend and backend for consistent deployments across any environment
- **Smarter RAG** — Implement hybrid search combining FAISS vector search with keyword BM25 search for more accurate retrieval
- **Chat History Persistence** — Save chat conversations to a database so users can revisit past Q&A sessions
- **Mobile App** — Build a React Native mobile application for on-the-go legal information access
- **Real-time Legal Updates** — Automatically detect and process amendments to existing laws when official sources are updated

---

## 🔄 Explanation of the Automation Pipeline

The core value of this system is that **zero legal content is manually written**. Here is how the automation works end to end:

**Step 1 — Source Ingestion**
Official government PDFs are sourced from `indiacode.nic.in` and placed in the `/data` directory. These are the raw, unprocessed legal documents exactly as published by the Government of India.

**Step 2 — PDF Parsing**
`pdfplumber` extracts raw text from each PDF, handling multi-column layouts and legal formatting to produce clean plain text.

**Step 3 — Chunking**
The extracted text is split into overlapping chunks (500 tokens, 50 token overlap) using LangChain's text splitter. Overlap ensures that sentences spanning chunk boundaries are not lost.

**Step 4 — Embedding**
Each chunk is converted into a high-dimensional vector using OpenAI's `text-embedding-3-small` model. These vectors capture the semantic meaning of each chunk of legal text.

**Step 5 — Vector Store**
All embeddings are stored in a FAISS index persisted to disk. This enables fast semantic similarity search across thousands of legal text chunks without reprocessing on every request.

**Step 6 — RAG Retrieval**
When a user requests a summary, key info, or asks a question, the system embeds the query and retrieves the top-k most semantically relevant chunks from the FAISS index.

**Step 7 — LLM Generation**
The retrieved chunks are passed as context to GPT-4o-mini along with a carefully crafted prompt. The model generates plain-English summaries, structured key information, or answers — all grounded in the actual legal document content.

**Step 8 — Caching**
Generated outputs are cached as JSON files on disk. Subsequent requests for the same topic are served instantly from cache without additional API calls, reducing cost and latency.

---

## 👨‍💻 Author

**Cleaven Dcosta**  
LegalX AI/ML Internship — Round 2 Assessment  
Built with FastAPI, React, LangChain, FAISS, and OpenAI APIs
