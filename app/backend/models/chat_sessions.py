from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Chat_sessions(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    diagnosis_id = Column(Integer, nullable=True)
    message_count = Column(Integer, nullable=True)
    last_message_preview = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)