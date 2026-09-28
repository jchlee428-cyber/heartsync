from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class User_plans(Base):
    __tablename__ = "user_plans"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    plan_type = Column(String, nullable=False)
    analyses_remaining = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=True)
    order_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)