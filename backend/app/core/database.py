import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use Environment variable from Docker, fallback to localhost for testing
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:30002/headhunter_db")

engine = create_engine(
    DATABASE_URL,
    pool_size=20,       # Increase from default 5
    max_overflow=40,    # Increase from default 10
    pool_timeout=60     # Wait longer before giving up
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()