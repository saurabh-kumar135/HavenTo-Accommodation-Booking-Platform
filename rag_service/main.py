"""
main.py — HavenTo RAG Memory FastAPI Server
============================================
Exposes HTTP endpoints for Express backend to retrieve semantic memories
and save new conversation turns using Pydantic validation.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    SaveMemoryRequest,
    MemoryQuery,
    RAGContextResponse,
    HealthResponse,
)
from memory import (
    save_conversation,
    build_memory_context,
    get_embedder,
    get_collection,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm model on startup
    print("🚀 Starting HavenTo RAG Memory Service...")
    try:
        get_embedder()
        print("✅ Embedding model pre-warmed and ready.")
    except Exception as e:
        print(f"⚠️ Model pre-warm failed: {e}")
    yield
    print("🛑 Shutting down HavenTo RAG Memory Service...")


app = FastAPI(
    title="HavenTo RAG Memory API",
    version="1.0.0",
    description="Vector memory service for HavenTo AI Assistant using Pydantic and SentenceTransformers",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check and status endpoint."""
    total = 0
    try:
        coll = get_collection()
        total = coll.count_documents({})
    except Exception:
        pass

    return HealthResponse(
        status="ok",
        service="havento-rag-memory",
        total_memories=total,
        model_loaded=True,
    )


@app.post("/memory/context", response_model=RAGContextResponse)
async def get_rag_context(query_data: MemoryQuery):
    """
    Retrieve semantic and recent memory context for a user's prompt.
    Validated by Pydantic MemoryQuery.
    """
    try:
        context_response = build_memory_context(
            user_id=query_data.user_id,
            query=query_data.query,
            top_k=query_data.top_k,
        )
        return context_response
    except Exception as e:
        print(f"❌ Error in /memory/context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/save")
async def save_memory(save_data: SaveMemoryRequest):
    """
    Save a user/agent conversation turn with its 384-dim vector embedding.
    Validated by Pydantic SaveMemoryRequest.
    """
    try:
        success = save_conversation(
            user_id=save_data.user_id,
            user_message=save_data.user_message,
            agent_response=save_data.agent_response,
        )
        return {
            "success": success,
            "message": "Memory saved successfully" if success else "Failed to save memory",
        }
    except Exception as e:
        print(f"❌ Error in /memory/save: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
