import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.diagnoses import DiagnosesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/diagnoses", tags=["diagnoses"])


# ---------- Pydantic Schemas ----------
class DiagnosesData(BaseModel):
    """Entity data schema (for create/update)"""
    answers: str = None
    scores: str = None
    total_score: int = None
    ai_report: str = None
    created_at: Optional[datetime] = None


class DiagnosesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    answers: Optional[str] = None
    scores: Optional[str] = None
    total_score: Optional[int] = None
    ai_report: Optional[str] = None
    created_at: Optional[datetime] = None


class DiagnosesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    answers: Optional[str] = None
    scores: Optional[str] = None
    total_score: Optional[int] = None
    ai_report: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DiagnosesListResponse(BaseModel):
    """List response schema"""
    items: List[DiagnosesResponse]
    total: int
    skip: int
    limit: int


class DiagnosesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[DiagnosesData]


class DiagnosesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: DiagnosesUpdateData


class DiagnosesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[DiagnosesBatchUpdateItem]


class DiagnosesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=DiagnosesListResponse)
async def query_diagnosess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query diagnosess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying diagnosess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = DiagnosesService(db)
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
        logger.debug(f"Found {result['total']} diagnosess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying diagnosess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=DiagnosesListResponse)
async def query_diagnosess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query diagnosess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying diagnosess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = DiagnosesService(db)
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
        logger.debug(f"Found {result['total']} diagnosess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying diagnosess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=DiagnosesResponse)
async def get_diagnoses(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single diagnoses by ID (user can only see their own records)"""
    logger.debug(f"Fetching diagnoses with id: {id}, fields={fields}")
    
    service = DiagnosesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Diagnoses with id {id} not found")
            raise HTTPException(status_code=404, detail="Diagnoses not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching diagnoses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=DiagnosesResponse, status_code=201)
async def create_diagnoses(
    data: DiagnosesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new diagnoses"""
    logger.debug(f"Creating new diagnoses with data: {data}")
    
    service = DiagnosesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create diagnoses")
        
        logger.info(f"Diagnoses created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating diagnoses: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating diagnoses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[DiagnosesResponse], status_code=201)
async def create_diagnosess_batch(
    request: DiagnosesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple diagnosess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} diagnosess")
    
    service = DiagnosesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} diagnosess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[DiagnosesResponse])
async def update_diagnosess_batch(
    request: DiagnosesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple diagnosess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} diagnosess")
    
    service = DiagnosesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} diagnosess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=DiagnosesResponse)
async def update_diagnoses(
    id: int,
    data: DiagnosesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing diagnoses (requires ownership)"""
    logger.debug(f"Updating diagnoses {id} with data: {data}")

    service = DiagnosesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Diagnoses with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Diagnoses not found")
        
        logger.info(f"Diagnoses {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating diagnoses {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating diagnoses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_diagnosess_batch(
    request: DiagnosesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple diagnosess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} diagnosess")
    
    service = DiagnosesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} diagnosess successfully")
        return {"message": f"Successfully deleted {deleted_count} diagnosess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_diagnoses(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single diagnoses by ID (requires ownership)"""
    logger.debug(f"Deleting diagnoses with id: {id}")
    
    service = DiagnosesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Diagnoses with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Diagnoses not found")
        
        logger.info(f"Diagnoses {id} deleted successfully")
        return {"message": "Diagnoses deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting diagnoses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")