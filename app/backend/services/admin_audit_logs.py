import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_audit_logs import Admin_audit_logs

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Admin_audit_logsService:
    """Service layer for Admin_audit_logs operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Admin_audit_logs]:
        """Create a new admin_audit_logs"""
        try:
            obj = Admin_audit_logs(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created admin_audit_logs with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating admin_audit_logs: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Admin_audit_logs]:
        """Get admin_audit_logs by ID"""
        try:
            query = select(Admin_audit_logs).where(Admin_audit_logs.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_audit_logs {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of admin_audit_logss"""
        try:
            query = select(Admin_audit_logs)
            count_query = select(func.count(Admin_audit_logs.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Admin_audit_logs, field):
                        query = query.where(getattr(Admin_audit_logs, field) == value)
                        count_query = count_query.where(getattr(Admin_audit_logs, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Admin_audit_logs, field_name):
                        query = query.order_by(getattr(Admin_audit_logs, field_name).desc())
                else:
                    if hasattr(Admin_audit_logs, sort):
                        query = query.order_by(getattr(Admin_audit_logs, sort))
            else:
                query = query.order_by(Admin_audit_logs.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching admin_audit_logs list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Admin_audit_logs]:
        """Update admin_audit_logs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_audit_logs {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated admin_audit_logs {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating admin_audit_logs {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete admin_audit_logs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_audit_logs {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted admin_audit_logs {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting admin_audit_logs {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Admin_audit_logs]:
        """Get admin_audit_logs by any field"""
        try:
            if not hasattr(Admin_audit_logs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_audit_logs")
            result = await self.db.execute(
                select(Admin_audit_logs).where(getattr(Admin_audit_logs, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_audit_logs by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Admin_audit_logs]:
        """Get list of admin_audit_logss filtered by field"""
        try:
            if not hasattr(Admin_audit_logs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_audit_logs")
            result = await self.db.execute(
                select(Admin_audit_logs)
                .where(getattr(Admin_audit_logs, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Admin_audit_logs.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching admin_audit_logss by {field_name}: {str(e)}")
            raise