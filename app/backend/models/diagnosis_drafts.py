from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Diagnosis_drafts(Base):
    __tablename__ = "diagnosis_drafts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    answers = Column(String, nullable=True)
    current_question = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)