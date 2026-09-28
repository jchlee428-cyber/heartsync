import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.chat_ratings import Chat_ratings

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Chat_ratingsService:
    """Service layer for Chat_ratings operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Chat_ratings]:
        """Create a new chat_ratings"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Chat_ratings(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created chat_ratings with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating chat_ratings: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for chat_ratings {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Chat_ratings]:
        """Get chat_ratings by ID (user can only see their own records)"""
        try:
            query = select(Chat_ratings).where(Chat_ratings.id == obj_id)
            if user_id:
                query = query.where(Chat_ratings.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching chat_ratings {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of chat_ratingss (user can only see their own records)"""
        try:
            query = select(Chat_ratings)
            count_query = select(func.count(Chat_ratings.id))
            
            if user_id:
                query = query.where(Chat_ratings.user_id == user_id)
                count_query = count_query.where(Chat_ratings.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Chat_ratings, field):
                        query = query.where(getattr(Chat_ratings, field) == value)
                        count_query = count_query.where(getattr(Chat_ratings, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Chat_ratings, field_name):
                        query = query.order_by(getattr(Chat_ratings, field_name).desc())
                else:
                    if hasattr(Chat_ratings, sort):
                        query = query.order_by(getattr(Chat_ratings, sort))
            else:
                query = query.order_by(Chat_ratings.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching chat_ratings list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Chat_ratings]:
        """Update chat_ratings (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Chat_ratings {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated chat_ratings {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating chat_ratings {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete chat_ratings (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Chat_ratings {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted chat_ratings {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting chat_ratings {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Chat_ratings]:
        """Get chat_ratings by any field"""
        try:
            if not hasattr(Chat_ratings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Chat_ratings")
            result = await self.db.execute(
                select(Chat_ratings).where(getattr(Chat_ratings, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching chat_ratings by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Chat_ratings]:
        """Get list of chat_ratingss filtered by field"""
        try:
            if not hasattr(Chat_ratings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Chat_ratings")
            result = await self.db.execute(
                select(Chat_ratings)
                .where(getattr(Chat_ratings, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Chat_ratings.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching chat_ratingss by {field_name}: {str(e)}")
            raise