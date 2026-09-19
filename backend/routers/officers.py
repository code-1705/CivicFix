from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from typing import List, Optional
from models import LoginRequest, TokenResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_officer
from database import db
from datetime import datetime, timezone
import math
import os
import uuid
from services.sms_service import send_sms
from services.storage_service import storage_service

router = APIRouter()

# Haversine mock for geofence check
def calculate_distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111139 # rough meters conversion

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    # Mocking DB officer lookup
    if db.use_mock:
        officer = next((v for k, v in db._mock_officers.items() if v["ward"] == request.wardNo), None)
    else:
        # Real DB lookup would happen here
        officer = {"officer_id": "real_officer_id", "ward": request.wardNo, "password_hash": get_password_hash("test")} # Mock fallback for now
        
    if not officer:
        raise HTTPException(status_code=401, detail="Invalid Ward or Password")
        
    # For hackathon, bypass strict password check if password is 'admin123'
    if request.password != "admin123" and not verify_password(request.password, officer["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid Password")
        
    access_token = create_access_token(data={"sub": officer["officer_id"], "wardNo": officer["ward"]})
    return {"access_token": access_token, "token_type": "bearer", "wardNo": officer["ward"]}


@router.get("/ward_complain/{ward_number}")
async def get_ward_complaints(ward_number: str, current_officer: dict = Depends(get_current_officer)):
    # Authorization Check
    if current_officer["wardNo"] != ward_number:
        raise HTTPException(status_code=403, detail="Forbidden. You are not assigned to this ward.")
        
    tickets = db.get_master_tickets_by_ward(ward_number)
    
    enriched_tickets = []
    for t in tickets:
        ticket_copy = dict(t)
        coupled_images = []
        for cid in t.get("complaint_ids", []):
            comp = db.get_complaint(cid)
            if comp:
                urls = comp.get("image_urls") or ([comp.get("image_url")] if comp.get("image_url") else [])
                for u in urls:
                    if u and u not in coupled_images:
                        coupled_images.append(u)
        ticket_copy["coupled_images"] = coupled_images
        enriched_tickets.append(ticket_copy)
        
    return enriched_tickets


@router.post("/resolve/{master_ticket_id}")
async def resolve_ticket(
    master_ticket_id: str,
    lat: float = Form(...),
    lng: float = Form(...),
    override: Optional[str] = Form("false"),
    proof_images: List[UploadFile] = File(default=[]),
    proof_image: Optional[UploadFile] = File(None),
    current_officer: dict = Depends(get_current_officer)
):
    # Fetch Master Ticket
    if db.use_mock:
        ticket = db._mock_master_tickets.get(master_ticket_id)
    else:
        response = db.tickets_table.get_item(Key={"master_ticket_id": master_ticket_id})
        ticket = response.get("Item")
        
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Auth check
    if current_officer["wardNo"] != ticket["ward"]:
        raise HTTPException(status_code=403, detail="Forbidden. You cannot resolve tickets for other wards.")
        
    # Geofence check (100m tolerance)
    override_bool = str(override).lower() in ("true", "1", "yes")
    distance = calculate_distance(lat, lng, ticket["lat"], ticket["lng"])
    if distance > 100 and not override_bool:
        raise HTTPException(status_code=400, detail=f"Geofence Failed: You are {int(distance)}m away from the issue. Must be within 100m.")
        
    # Gather proof images — use proof_images list; fall back to single proof_image only if list is empty
    files_to_save = [f for f in (proof_images or []) if f and f.filename]
    if not files_to_save and proof_image and proof_image.filename:
        files_to_save.append(proof_image)

    if not files_to_save:
        raise HTTPException(status_code=400, detail="At least one resolution proof photo is required.")

    resolved_image_urls = []
    for file_obj in files_to_save:
        proof_content = await file_obj.read()
        public_url, _ = storage_service.save_file(proof_content, file_obj.filename or "", prefix="resolved_")
        resolved_image_urls.append(public_url)

    primary_image_url = resolved_image_urls[0] if resolved_image_urls else None

    # Update Status
    resolved_time = datetime.now(timezone.utc).isoformat()
    if db.use_mock:
        db.update_master_ticket(master_ticket_id, {
            "status": "resolved",
            "resolved_at": resolved_time,
            "resolved_image_url": primary_image_url,
            "resolved_image_urls": resolved_image_urls
        })
        
        # Also update associated complaints and notify citizens via SMS
        for cid in db._mock_master_tickets[master_ticket_id].get("complaint_ids", []):
            db.update_complaint(cid, {
                "status": "resolved",
                "resolved_at": resolved_time,
                "resolved_image_url": primary_image_url,
                "resolved_image_urls": resolved_image_urls
            })
            complaint = db.get_complaint(cid)
            if complaint and complaint.get("mobile"):
                send_sms(
                    complaint["mobile"],
                    f"{cid} resolved"
                )
    else:
        # DynamoDB update expression
        pass
        
    return {
        "status": "resolved", 
        "master_ticket_id": master_ticket_id,
        "resolved_image_url": primary_image_url,
        "resolved_image_urls": resolved_image_urls
    }

@router.post("/tickets/{master_ticket_id}/relay")
async def relay_ward_ticket(
    master_ticket_id: str,
    to_department: str = Form(...),
    notes: Optional[str] = Form(None),
    current_officer: dict = Depends(get_current_officer)
):
    ticket = db.relay_ticket(
        master_ticket_id=master_ticket_id,
        to_department=to_department,
        officer_id=current_officer.get("officer_id", current_officer.get("sub", "officer")),
        notes=notes
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Master ticket not found")
    return {
        "status": "relayed",
        "master_ticket_id": master_ticket_id,
        "assigned_department": ticket.get("assigned_department"),
        "relay_history": ticket.get("relay_history", [])
    }

