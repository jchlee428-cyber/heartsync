import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.sync_logs import Sync_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sync-logs", tags=["sync-logs-cleanup"])


@router.post("/cleanup")
async def cleanup_old_sync_logs(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete sync_logs older than 30 days for the current user"""
    try:
        cutoff = datetime.now() - timedelta(days=30)
        stmt = delete(Sync_logs).where(
            Sync_logs.user_id == current_user.id,
            Sync_logs.created_at < cutoff,
        )
        result = await db.execute(stmt)
        await db.commit()
        deleted_count = result.rowcount
        logger.info(f"Cleaned up {deleted_count} old sync logs for user {current_user.id}")
        return {"deleted_count": deleted_count, "cutoff_date": cutoff.isoformat()}
    except Exception as e:
        await db.rollback()
        logger.error(f"Sync log cleanup error: {e}")
        raise


@router.delete("/clear-all")
async def clear_all_sync_logs(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete ALL sync_logs for the current user (manual clear)"""
    try:
        stmt = delete(Sync_logs).where(Sync_logs.user_id == current_user.id)
        result = await db.execute(stmt)
        await db.commit()
        deleted_count = result.rowcount
        logger.info(f"Cleared all {deleted_count} sync logs for user {current_user.id}")
        return {"deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Sync log clear error: {e}")
        raise