import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class InterviewSession(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    jd_raw = Column(Text, nullable=True)
    resume_raw = Column(Text, nullable=True)
    jd_brief = Column(Text, nullable=True)
    resume_brief = Column(Text, nullable=True)
    
    rounds = Column(JSON, default=list)  # e.g. ["technical", "behavioral"]
    current_round_index = Column(Integer, default=0)
    difficulty = Column(String(20), default="Mid")      # Junior, Mid, Senior
    strictness = Column(String(20), default="Realistic") # Friendly, Realistic, Tough
    avatar_mode = Column(String(10), default="2d")       # 2d, 3d
    questions_per_round = Column(Integer, default=6)
    
    plan_json = Column(JSON, nullable=True)
    running_summary = Column(Text, default="")
    status = Column(String(20), default="planning")     # planning, in_progress, completed, aborted
    final_report = Column(JSON, nullable=True)
    
    turns = relationship("InterviewTurn", back_populates="session", cascade="all, delete-orphan", order_by="InterviewTurn.turn_index")


class InterviewTurn(Base):
    __tablename__ = "turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    turn_index = Column(Integer, default=0)
    round_type = Column(String(50), default="technical")
    
    question_text = Column(Text, nullable=False)
    acknowledgement = Column(String(255), default="")
    audio_path = Column(String(255), nullable=True)
    
    is_followup = Column(Boolean, default=False)
    followup_count = Column(Integer, default=0)
    topic = Column(String(100), default="")
    hint_requested = Column(Boolean, default=False)
    skipped = Column(Boolean, default=False)
    
    typed_text = Column(Text, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    merged_answer = Column(Text, nullable=True)
    
    delivery_metrics = Column(JSON, nullable=True)
    evaluation = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="turns")
