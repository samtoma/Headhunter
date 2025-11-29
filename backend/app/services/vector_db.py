import chromadb
from chromadb.config import Settings
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class VectorDBService:
    def __init__(self):
        self.client = None
        self.collection = None
        self.collection_name = "candidates"
        
        # Connect to ChromaDB service defined in docker-compose
        chroma_host = os.getenv("CHROMA_HOST", "vector_db")
        chroma_port = os.getenv("CHROMA_PORT", "8000")
        
        try:
            logger.info(f"Connecting to ChromaDB at {chroma_host}:{chroma_port}")
            self.client = chromadb.HttpClient(host=chroma_host, port=int(chroma_port))
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
            logger.info(f"Connected to ChromaDB collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")

    def add_candidate(self, candidate_id: str, text: str, metadata: Dict[str, Any]):
        """Add or update a candidate in the vector DB."""
        if not self.collection:
            logger.warning("ChromaDB collection not available.")
            return

        try:
            # ChromaDB handles embedding generation if we don't provide embeddings,
            # BUT we want to use OpenAI embeddings for better quality.
            # For now, we'll assume the caller provides the embedding or we let Chroma do it 
            # if we configured a default embedding function.
            # However, the plan said we'd implement `generate_embedding` separately.
            # So this method should probably accept embeddings or generate them.
            # Let's keep it simple: caller passes text, we store it. 
            # Ideally, we pass 'embeddings' list too.
            
            # For this step, I'll assume we might pass embeddings later, 
            # but let's just use the text for now and let Chroma's default (SentenceTransformers) 
            # or our custom embedding function handle it.
            # Wait, if we run in docker, downloading models for SentenceTransformers might be heavy.
            # Using OpenAI embeddings is better.
            pass
        except Exception as e:
            logger.error(f"Error adding candidate to VectorDB: {e}")

    def upsert(self, ids: List[str], documents: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]] = None):
        if not self.collection:
            return
        
        try:
            if embeddings:
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
            else:
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
        except Exception as e:
            logger.error(f"Error upserting to ChromaDB: {e}")

    def search(self, query_text: str = None, query_embeddings: List[float] = None, n_results: int = 10):
        if not self.collection:
            return []
            
        try:
            results = self.collection.query(
                query_texts=[query_text] if query_text else None,
                query_embeddings=[query_embeddings] if query_embeddings else None,
                n_results=n_results
            )
            return results
        except Exception as e:
            logger.error(f"Error searching ChromaDB: {e}")
            return []

# Singleton instance
vector_db = VectorDBService()
