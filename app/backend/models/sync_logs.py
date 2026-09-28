from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Sync_logs(Base):
    __tablename__ = "sync_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    attempt_count = Column(Integer, nullable=False)
    error_message = Column(String, nullable=True)
    sync_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)