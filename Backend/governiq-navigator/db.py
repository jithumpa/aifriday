from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Simple SQLite database (no Docker needed)
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///governance.db')

engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
