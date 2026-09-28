from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Chat_ratings(Base):
    __tablename__ = "chat_ratings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    session_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)
    feedback_tags = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)