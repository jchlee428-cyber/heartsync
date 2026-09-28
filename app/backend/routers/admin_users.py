import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_admin_user
from models.auth import User
from models.admin_audit_logs import Admin_audit_logs
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])


class UserListItem(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "user"
    created_at: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserListItem]
    total: int
    skip: int
    limit: int


class UpdateRoleRequest(BaseModel):
    role: str  # "admin" or "user"


@router.get("", response_model=UserListResponse)
async def list_users(
    search: str = Query(None, description="Search by email or name"),
    role: str = Query(None, description="Filter by role"),
    sort: str = Query("-created_at", description="Sort field"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users with search and filtering (admin only)."""
    query = select(User)

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(search_pattern),
                User.name.ilike(search_pattern),
            )
        )

    # Role filter
    if role:
        query = query.where(User.role == role)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    if sort.startswith("-"):
        sort_field = sort[1:]
        sort_col = getattr(User, sort_field, User.created_at)
        query = query.order_by(sort_col.desc())
    else:
        sort_col = getattr(User, sort, User.created_at)
        query = query.order_by(sort_col.asc())

    # Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    items = []
    for u in users:
        items.append(
            UserListItem(
                id=u.id,
                email=u.email,
                name=u.name,
                role=u.role or "user",
                created_at=u.created_at.isoformat() if u.created_at else None,
                last_login=u.last_login.isoformat() if u.last_login else None,
            )
        )

    return UserListResponse(items=items, total=total, skip=skip, limit=limit)


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    request: UpdateRoleRequest,
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role (admin only)."""
    if request.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")

    # Prevent admin from removing their own admin role
    if user_id == current_user.id and request.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="자신의 관리자 권한은 제거할 수 없습니다.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = request.role

    # Record audit log
    audit_log = Admin_audit_logs(
        admin_id=current_user.id,
        admin_email=current_user.email,
        action_type="role_change",
        target_type="user",
        target_id=user_id,
        description=f"사용자 '{user.email}'의 역할을 '{old_role}' → '{request.role}'로 변경",
        details=json.dumps({
            "user_email": user.email,
            "old_role": old_role,
            "new_role": request.role,
        }, ensure_ascii=False),
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(user)

    logger.info(
        f"User role updated: {user_id} ({user.email}) {old_role} -> {request.role} by admin {current_user.id}"
    )

    return {
        "message": f"사용자 역할이 '{request.role}'로 변경되었습니다.",
        "user_id": user_id,
        "old_role": old_role,
        "new_role": request.role,
    }