from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Admin_audit_logs(Base):
    __tablename__ = "admin_audit_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    admin_id = Column(String, nullable=False)
    admin_email = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    description = Column(String, nullable=False)
    details = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)