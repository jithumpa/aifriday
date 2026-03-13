from sqlalchemy import Column, Integer, String, Date, DateTime, Float, Text
from sqlalchemy.orm import declarative_base
import datetime

Base = declarative_base()

class Metric(Base):
    __tablename__ = 'metrics'
    id = Column(Integer, primary_key=True)
    source = Column(String, index=True)  # 'esg' or 'dei'
    date = Column(Date, index=True)
    org_unit = Column(String, index=True)
    metric_name = Column(String, index=True)
    value = Column(Float)
    unit = Column(String)
    raw_row = Column(Text)

class Initiative(Base):
    __tablename__ = 'initiatives'
    id = Column(String, primary_key=True)  # use provided id
    name = Column(String)
    owner = Column(String)
    pillar = Column(String)
    status = Column(String)
    due_date = Column(Date)
    last_update = Column(DateTime)
    raw_row = Column(Text)

class Note(Base):
    __tablename__ = 'notes'
    id = Column(Integer, primary_key=True)
    source = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Brief(Base):
    __tablename__ = 'briefs'
    id = Column(Integer, primary_key=True)
    week_start = Column(Date)
    content_md = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
