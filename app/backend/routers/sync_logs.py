import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.sync_logs import Sync_logsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/sync_logs", tags=["sync_logs"])


# ---------- Pydantic Schemas ----------
class Sync_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    status: str
    attempt_count: int
    error_message: str = None
    sync_type: str
    created_at: datetime


class Sync_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    status: Optional[str] = None
    attempt_count: Optional[int] = None
    error_message: Optional[str] = None
    sync_type: Optional[str] = None
    created_at: Optional[datetime] = None


class Sync_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    status: str
    attempt_count: int
    error_message: Optional[str] = None
    sync_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class Sync_logsListResponse(BaseModel):
    """List response schema"""
    items: List[Sync_logsResponse]
    total: int
    skip: int
    limit: int


class Sync_logsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Sync_logsData]


class Sync_logsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Sync_logsUpdateData


class Sync_logsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Sync_logsBatchUpdateItem]


class Sync_logsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Sync_logsListResponse)
async def query_sync_logss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query sync_logss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying sync_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Sync_logsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} sync_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sync_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Sync_logsListResponse)
async def query_sync_logss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query sync_logss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying sync_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Sync_logsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} sync_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sync_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Sync_logsResponse)
async def get_sync_logs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sync_logs by ID (user can only see their own records)"""
    logger.debug(f"Fetching sync_logs with id: {id}, fields={fields}")
    
    service = Sync_logsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Sync_logs with id {id} not found")
            raise HTTPException(status_code=404, detail="Sync_logs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sync_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Sync_logsResponse, status_code=201)
async def create_sync_logs(
    data: Sync_logsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new sync_logs"""
    logger.debug(f"Creating new sync_logs with data: {data}")
    
    service = Sync_logsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create sync_logs")
        
        logger.info(f"Sync_logs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating sync_logs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sync_logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Sync_logsResponse], status_code=201)
async def create_sync_logss_batch(
    request: Sync_logsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sync_logss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} sync_logss")
    
    service = Sync_logsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} sync_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Sync_logsResponse])
async def update_sync_logss_batch(
    request: Sync_logsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple sync_logss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} sync_logss")
    
    service = Sync_logsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} sync_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Sync_logsResponse)
async def update_sync_logs(
    id: int,
    data: Sync_logsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sync_logs (requires ownership)"""
    logger.debug(f"Updating sync_logs {id} with data: {data}")

    service = Sync_logsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Sync_logs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Sync_logs not found")
        
        logger.info(f"Sync_logs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating sync_logs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating sync_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_sync_logss_batch(
    request: Sync_logsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple sync_logss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} sync_logss")
    
    service = Sync_logsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} sync_logss successfully")
        return {"message": f"Successfully deleted {deleted_count} sync_logss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_sync_logs(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single sync_logs by ID (requires ownership)"""
    logger.debug(f"Deleting sync_logs with id: {id}")
    
    service = Sync_logsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Sync_logs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Sync_logs not found")
        
        logger.info(f"Sync_logs {id} deleted successfully")
        return {"message": "Sync_logs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sync_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")