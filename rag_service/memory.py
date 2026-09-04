"""
memory.py — RAG Memory Engine for HavenTo
==========================================
Stores user conversations with 384-dimensional vector embeddings in MongoDB.
Retrieves the most semantically relevant memories or recent interactions
and formats them for injection into the Groq LLM context.
Uses FastEmbed (ONNX) or SentenceTransformer for 384-dim all-MiniLM-L6-v2 embeddings.
"""

import os
import re
from datetime import datetime, timezone
from typing import List, Tuple, Optional

import numpy as np
from dotenv import load_dotenv
from pymongo import MongoClient

from pathlib import Path
from schemas import MemoryItem, RAGContextResponse

# Load .env from rag_service or parent directory (HavenTo root)
_parent_env = Path(__file__).resolve().parent.parent / ".env"
if _parent_env.exists():
    load_dotenv(_parent_env)
load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────
MONGO_URI = (
    os.getenv("MONGODB_URI")
    or os.getenv("MONGO_URI")
    or "mongodb+srv://CRUDABC:MAKEFILE12345@cluster1.vzxjvpm.mongodb.net/HavenTo?retryWrites=true&w=majority&appName=cluster1"
)
DB_NAME = "HavenTo"
COLL_NAME = "user_memories"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_TOP_K = 3
MIN_SIMILARITY = 0.32

# ── Lazy Globals ──────────────────────────────────────────────────────────────
_client = None
_collection = None
_embedder = None
_embedder_type = None


def get_collection():
    """Connect to MongoDB user_memories collection."""
    global _client, _collection
    if _collection is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _collection = _client[DB_NAME][COLL_NAME]
        _collection.create_index([("user_id", 1), ("timestamp", -1)])
    return _collection


def get_embedder():
    """Load embedding model (tries FastEmbed first for speed and low RAM, then sentence_transformers)."""
    global _embedder, _embedder_type
    if _embedder is None:
        try:
            from fastembed import TextEmbedding
            print(f"🧠 Loading FastEmbed model ('{MODEL_NAME}')...")
            _embedder = TextEmbedding(model_name=MODEL_NAME)
            _embedder_type = "fastembed"
            print("✅ FastEmbed model ready.")
        except Exception as fe_err:
            print(f"FastEmbed not used ({fe_err}), falling back to SentenceTransformer...")
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
            _embedder_type = "sentence_transformers"
            print("✅ SentenceTransformer ready.")
    return _embedder


def embed_text(text: str) -> List[float]:
    """Convert text into a 384-dimensional normalized float vector."""
    get_embedder()
    if _embedder_type == "fastembed":
        embeddings = list(_embedder.embed([text]))
        vec = embeddings[0]
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
    else:
        embedding = _embedder.encode(text, normalize_embeddings=True)
        return embedding.tolist()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    if norm == 0:
        return 0.0
    return float(np.dot(a, b) / (norm + 1e-8))


def is_meta_query(query: str) -> bool:
    """Detect if the user is asking about their previous questions/history."""
    patterns = [
        r"previous(ly)?",
        r"earlier",
        r"last (question|time|search|prompt|stay|message)",
        r"what did i (ask|say|search|look)",
        r"remember",
        r"before",
        r"history",
    ]
    q_lower = query.lower()
    return any(re.search(pat, q_lower) for pat in patterns)


def save_conversation(user_id: str, user_message: str, agent_response: str) -> bool:
    """
    Generate embedding and persist the user/agent exchange to MongoDB.
    """
    if not user_id or not user_message or not agent_response:
        return False

    try:
        coll = get_collection()
        combined_text = f"User: {user_message.strip()}\nAgent: {agent_response.strip()}"
        embedding = embed_text(combined_text)

        coll.insert_one(
            {
                "user_id": str(user_id),
                "user_message": user_message.strip(),
                "agent_response": agent_response.strip(),
                "combined_text": combined_text,
                "embedding": embedding,
                "timestamp": datetime.now(timezone.utc),
            }
        )
        return True
    except Exception as e:
        print(f"⚠️ Failed to save memory to MongoDB: {e}")
        return False


def retrieve_relevant(user_id: str, query: str, top_k: int = DEFAULT_TOP_K) -> List[MemoryItem]:
    """
    Retrieve the most relevant past conversations for this user using
    vector cosine similarity with fallback to recent history.
    """
    if not user_id or not query:
        return []

    try:
        coll = get_collection()
        user_docs = list(
            coll.find({"user_id": str(user_id)})
            .sort("timestamp", -1)
            .limit(50)
        )

        if not user_docs:
            return []

        query_vector = embed_text(query)
        meta_query = is_meta_query(query)

        scored: List[Tuple[float, dict]] = []
        for doc in user_docs:
            if "embedding" in doc and doc["embedding"]:
                sim = cosine_similarity(query_vector, doc["embedding"])
                scored.append((sim, doc))

        scored.sort(key=lambda x: x[0], reverse=True)

        memory_items: List[MemoryItem] = []

        # 1. Add matches exceeding similarity threshold
        for sim, doc in scored[:top_k]:
            if sim >= MIN_SIMILARITY:
                ts_str = doc.get("timestamp").isoformat() if doc.get("timestamp") else None
                memory_items.append(
                    MemoryItem(
                        user_message=doc["user_message"],
                        agent_response=doc["agent_response"],
                        similarity=round(sim, 3),
                        timestamp=ts_str,
                    )
                )

        # 2. If it's a meta query ("what did I ask earlier?") or no vector matches,
        # fallback to the most recent conversation exchanges!
        if meta_query or len(memory_items) == 0:
            existing_msgs = {m.user_message for m in memory_items}
            for doc in user_docs:
                if doc["user_message"] not in existing_msgs:
                    ts_str = doc.get("timestamp").isoformat() if doc.get("timestamp") else None
                    memory_items.append(
                        MemoryItem(
                            user_message=doc["user_message"],
                            agent_response=doc["agent_response"],
                            similarity="recent",
                            timestamp=ts_str,
                        )
                    )
                    if len(memory_items) >= top_k:
                        break

        return memory_items
    except Exception as e:
        print(f"⚠️ Error retrieving memory: {e}")
        return []


def build_memory_context(user_id: str, query: str, top_k: int = DEFAULT_TOP_K) -> RAGContextResponse:
    """
    Build a structured RAGContextResponse containing formatted prompt context
    and raw validated memory records.
    """
    items = retrieve_relevant(user_id, query, top_k)

    if not items:
        return RAGContextResponse(
            user_id=str(user_id),
            has_memory=False,
            context_string="",
            memories=[],
        )

    lines = ["\n📚 RELEVANT USER MEMORY & PREVIOUS INTERACTIONS:"]
    for i, item in enumerate(items, 1):
        rel_label = f"similarity: {item.similarity}" if isinstance(item.similarity, float) else "recent exchange"
        lines.append(f"\n--- Past Memory {i} ({rel_label}) ---")
        lines.append(f"User asked: {item.user_message}")
        lines.append(f"Assistant answered: {item.agent_response[:350]}")

    lines.append("\n(Use this memory to answer questions like 'what did I ask before?' or retain user preferences)\n")

    return RAGContextResponse(
        user_id=str(user_id),
        has_memory=True,
        context_string="\n".join(lines),
        memories=items,
    )
