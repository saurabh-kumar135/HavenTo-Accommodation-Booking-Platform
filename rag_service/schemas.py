"""
schemas.py — Pydantic models for HavenTo RAG Memory Service
===========================================================
Defines strictly validated data structures for memory storage,
vector query retrieval, and LLM context formatting.
"""

from typing import List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


class SaveMemoryRequest(BaseModel):
    user_id: str = Field(description="MongoDB ObjectId of the HavenTo user")
    user_message: str = Field(description="The user's query or message")
    agent_response: str = Field(description="The agent's reply")

    model_config = ConfigDict(arbitrary_types_allowed=True)


class MemoryQuery(BaseModel):
    user_id: str = Field(description="MongoDB ObjectId of the user to retrieve memories for")
    query: str = Field(description="The current user question or statement")
    top_k: int = Field(default=3, description="Maximum number of relevant memories to return")


class MemoryItem(BaseModel):
    user_message: str = Field(description="Past question asked by the user")
    agent_response: str = Field(description="Past response given by the agent")
    similarity: Union[float, str] = Field(description="Cosine similarity score or 'recent'")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of the interaction")


class RAGContextResponse(BaseModel):
    user_id: str = Field(description="User ID for which memories were retrieved")
    has_memory: bool = Field(description="True if one or more relevant memories were found")
    context_string: str = Field(description="Pre-formatted prompt context to inject into LLM")
    memories: List[MemoryItem] = Field(default_factory=list, description="List of retrieved memory records")


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "havento-rag-memory"
    total_memories: int = 0
    model_loaded: bool = False
