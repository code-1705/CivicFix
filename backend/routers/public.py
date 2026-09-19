from fastapi import APIRouter, Query
from typing import Optional
from database import db

router = APIRouter(prefix="/public", tags=["Public Portal"])

@router.get("/tickets")
def get_public_tickets(
    city: Optional[str] = Query(None, description="Filter by city"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (open/resolved/all)"),
    search: Optional[str] = Query(None, description="Search keyword in ID or category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page")
):
    """
    Public paginated tickets feed with aggregate statistics for the national portal.
    """
    return db.get_all_master_tickets(
        city=city,
        department=department,
        status=status,
        search=search,
        page=page,
        limit=limit
    )

@router.get("/map_pins")
def get_public_map_pins():
    """
    Lightweight coordinates and metadata for interactive nationwide map rendering.
    """
    return {"pins": db.get_all_map_pins()}
