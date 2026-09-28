from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Orders(Base):
    __tablename__ = "orders"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    plan_type = Column(String, nullable=False)
    plan_name = Column(String, nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=True)
    status = Column(String, nullable=True)
    toss_payment_key = Column(String, nullable=True)
    toss_order_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)