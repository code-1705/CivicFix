from fastapi import APIRouter, File, Form, UploadFile, BackgroundTasks, HTTPException
from typing import List, Optional
from database import db
from services.ai_triage import process_complaint_task
from services.sms_service import send_sms
from services.storage_service import storage_service

import os
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/complain")
async def create_complaint(
    background_tasks: BackgroundTasks,
    lat: float = Form(...),
    lng: float = Form(...),
    mobile: Optional[str] = Form(None),
    images: List[UploadFile] = File(...)
):
    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed")

    # Determine Ward (Mocking Point-in-Polygon for hackathon)
    # E.g. if lat > 0 return 151, else 152
    ward = "151"
    
    saved_image_urls = []
    saved_image_paths = []
    for img in images:
        content = await img.read()
        public_url, local_path = storage_service.save_file(content, img.filename or "")
        saved_image_paths.append(local_path)
        saved_image_urls.append(public_url)
    
    complaint_data = {
        "lat": lat,
        "lng": lng,
        "mobile": mobile,
        "ward": ward,
        "status": "pending_triage",
        "image_count": len(images),
        "image_urls": saved_image_urls,
        "image_url": saved_image_urls[0] if saved_image_urls else None
    }
    
    complaint_id = db.create_complaint(complaint_data)
    print(f"[OK] Complaint {complaint_id} saved to DB. Queuing AI vision triage background task...", flush=True)

    # If phone number entered, send message with ONLY complain id
    if mobile:
        send_sms(mobile, complaint_id)
    
    # Spawn background task for AI with actual image paths
    background_tasks.add_task(
        process_complaint_task,
        complaint_id,
        ward,
        lat,
        lng,
        mobile,
        saved_image_paths
    )
    
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
