from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Diagnoses(Base):
    __tablename__ = "diagnoses"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    answers = Column(String, nullable=True)
    scores = Column(String, nullable=True)
    total_score = Column(Integer, nullable=True)
    ai_report = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)