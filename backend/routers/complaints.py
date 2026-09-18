from fastapi import APIRouter, File, Form, UploadFile, BackgroundTasks, HTTPException
from typing import List, Optional
from database import db
from services.ai_triage import process_complaint_task

router = APIRouter()

@router.post("/complain")
async def create_complaint(
    background_tasks: BackgroundTasks,
    lat: float = Form(...),
    lng: float = Form(...),
    mobile: Optional[str] = Form(None),
    images: List[UploadFile] = File(...)
):
    # Determine Ward (Mocking Point-in-Polygon for hackathon)
    # E.g. if lat > 0 return 151, else 152
    ward = "151"
    
    complaint_data = {
        "lat": lat,
        "lng": lng,
        "mobile": mobile,
        "ward": ward,
        "status": "pending_triage",
        "image_count": len(images) # S3 upload logic goes here
    }
    
    complaint_id = db.create_complaint(complaint_data)
    
    # Spawn background task for AI
    background_tasks.add_task(process_complaint_task, complaint_id, ward, lat, lng, mobile)
    
    return {"complaint_id": complaint_id, "status": "queued"}

@router.get("/status/{complaint_id}")
async def get_status(complaint_id: str):
    complaint = db.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # If it has a master ticket, fetch it for community impact count
    mt_id = complaint.get("master_ticket_id")
    mt_data = None
    if mt_id:
        if db.use_mock:
            mt_data = db._mock_master_tickets.get(mt_id)
        else:
            response = db.tickets_table.get_item(Key={"master_ticket_id": mt_id})
            mt_data = response.get("Item")
            
    return {
        "complaint": complaint,
        "master_ticket": mt_data
    }
