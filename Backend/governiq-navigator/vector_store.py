"""
Vector Store for RAG - stores meeting notes and historical context
Uses ChromaDB for local vector storage
"""
import chromadb
from chromadb.config import Settings
from config import CHROMA_PERSIST_DIR
import os

# Initialize ChromaDB client
def get_chroma_client():
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    return chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

def get_or_create_collection(name: str = "governance_docs"):
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"description": "Governance documents, notes, and historical briefs"}
    )

def add_document(text: str, metadata: dict, doc_id: str):
    """Add a document to the vector store"""
    collection = get_or_create_collection()
    collection.upsert(
        documents=[text],
        metadatas=[metadata],
        ids=[doc_id]
    )

def search_documents(query: str, n_results: int = 5):
    """Search for relevant documents"""
    collection = get_or_create_collection()
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    return results

def add_meeting_notes(text: str, source: str, note_id: int):
    """Add meeting notes to vector store for RAG"""
    add_document(
        text=text,
        metadata={"type": "meeting_notes", "source": source},
        doc_id=f"note_{note_id}"
    )

def add_brief_to_store(brief_content: str, week_start: str, brief_id: int):
    """Store historical briefs for context"""
    add_document(
        text=brief_content,
        metadata={"type": "brief", "week_start": week_start},
        doc_id=f"brief_{brief_id}"
    )
