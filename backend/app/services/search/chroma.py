import chromadb
import os
import logging
from typing import List, Dict, Any, Optional
from app.services.search.base import SearchEngine
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)

class ChromaSearchEngine(SearchEngine):
    def __init__(self):
        self.collection_name = "candidates"
        
        # Connect to ChromaDB service defined in docker-compose
        chroma_host = os.getenv("CHROMA_HOST", "vector_db")
        chroma_port = os.getenv("CHROMA_PORT", "8000")
        
        self.client = None
        self.collection = None
        
        try:
            logger.info(f"Connecting to ChromaDB at {chroma_host}:{chroma_port}")
            self.client = chromadb.HttpClient(host=chroma_host, port=int(chroma_port))
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
            logger.info(f"Connected to ChromaDB collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")

    async def index_candidate(self, candidate_id: str, text: str, metadata: Dict[str, Any]) -> bool:
        if not self.collection:
            logger.warning("ChromaDB collection not available.")
            return False

        try:
            # Generate embedding
            embedding = await generate_embedding(text)
            if not embedding:
                logger.error(f"Failed to generate embedding for candidate {candidate_id}")
                return False

            self.collection.upsert(
                ids=[str(candidate_id)],
                documents=[text],
                metadatas=[metadata],
                embeddings=[embedding]
            )
            return True
        except Exception as e:
            logger.error(f"Error indexing candidate {candidate_id}: {e}")
            return False
            
    def upsert(self, ids: List[str], documents: List[str], metadatas: List[Dict], embeddings: List[List[float]]) -> bool:
        if not self.collection:
            return False
        try:
            self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
            return True
        except Exception as e:
            logger.error(f"Error upserting to ChromaDB: {e}")
            return False

    async def search(self, query_text: str, n_results: int = 10, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        if not self.collection:
            return []
            
        try:
            # Generate query embedding
            query_embedding = await generate_embedding(query_text)
            if not query_embedding:
                return []

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=filters # ChromaDB supports 'where' clause for filtering
            )
            
            # Format results
            formatted_results = []
            if results and results['ids']:
                ids = results['ids'][0]
                metadatas = results['metadatas'][0]
                distances = results['distances'][0] if 'distances' in results else []
                
                for i, cid in enumerate(ids):
                    formatted_results.append({
                        "id": cid,
                        "metadata": metadatas[i] if i < len(metadatas) else {},
                        "score": 1.0 - distances[i] if i < len(distances) else 0.0 # Convert distance to similarity score approx
                    })
                    
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching ChromaDB: {e}")
            return []

    def delete_candidate(self, candidate_id: str) -> bool:
        if not self.collection:
            return False
            
        try:
            self.collection.delete(ids=[str(candidate_id)])
            return True
        except Exception as e:
            logger.error(f"Error deleting candidate {candidate_id}: {e}")
            return False
