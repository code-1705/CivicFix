from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from typing import List, Optional
from models import LoginRequest, TokenResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_officer
from database import db
from datetime import datetime, timezone
import math

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
    
    # Sort tickets to show high severity / breaching SLA first
    # (Implementation detail omitted for brevity, returning raw list for now)
    return tickets


@router.post("/resolve/{master_ticket_id}")
async def resolve_ticket(
    master_ticket_id: str,
    lat: float = Form(...),
    lng: float = Form(...),
    override: Optional[bool] = Form(False),
    proof_image: UploadFile = File(...),
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
    distance = calculate_distance(lat, lng, ticket["lat"], ticket["lng"])
    if distance > 100 and not override:
        raise HTTPException(status_code=400, detail=f"Geofence Failed: You are {int(distance)}m away from the issue. Must be within 100m.")
        
    # Update Status
    if db.use_mock:
        db._mock_master_tickets[master_ticket_id]["status"] = "resolved"
        db._mock_master_tickets[master_ticket_id]["resolved_at"] = datetime.now(timezone.utc).isoformat()
    else:
        # DynamoDB update expression
        pass
        
    # Trigger SMS to citizens who reported it (Iterating over complaint_ids)
    # import services.ai_triage -> send_sms()
    
    return {"status": "resolved", "master_ticket_id": master_ticket_id}
