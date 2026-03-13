import os

# OpenAI Configuration (using TCS GenAI Lab)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-Dv2fxfrdRE4kPGegyX6VBA")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://genailab.tcs.in/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "genailab-maas-gpt-4o")

# Vector Store Configuration
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

# Agent Configuration
MAX_AGENT_ITERATIONS = 5
