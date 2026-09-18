import os
import json
import time
from database import db

# Mock SMS Sender
def send_sms(phone_number: str, message: str):
    print(f"\n📱 [SMS TO {phone_number}]: {message}\n")
    # For hackathon: You would import twilio here and call the API
    # from twilio.rest import Client
    # client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    # client.messages.create(body=message, from_=os.getenv("TWILIO_PHONE_NUMBER"), to=phone_number)

def process_complaint_task(complaint_id: str, ward: str, lat: float, lng: float, phone: str):
    """
    This runs in the background. It mimics the AI triage and clustering.
    """
    use_mock_ai = os.getenv("USE_MOCK_AI", "true").lower() == "true"
    
    # 1. AI Triage
    if use_mock_ai:
        print(f"[{complaint_id}] Triage: Using Mock AI...")
        time.sleep(2) # simulate network delay
        ai_result = {
            "department": "Public Works",
            "description": "Large pothole in the middle of the road, dangerous for two-wheelers.",
            "confidence": 0.94,
            "urgency_tier": 4,
            "reasoning": "Depth > 2 inches, high traffic area."
        }
    else:
        print(f"[{complaint_id}] Triage: Calling Amazon Bedrock...")
        # Implement actual Bedrock boto3 call here
        ai_result = {
            "department": "Public Works",
            "description": "Live Bedrock inference output",
            "confidence": 0.85,
            "urgency_tier": 3,
            "reasoning": "Real reasoning."
        }
        
    # Update complaint with triage data
    db.update_complaint(complaint_id, {
        "status": "triaged",
        "triage_status": "complete",
        **ai_result
    })
    
    # 2. Geographic Clustering (30m Haversine Logic)
    import math
    from datetime import datetime, timedelta, timezone

    def calculate_distance(lat1, lon1, lat2, lon2):
        # Rough meters conversion for small distances (Haversine approximation)
        return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111139

    master_tickets = db.get_master_tickets_by_ward(ward)
    matched_ticket = None
    
    for mt in master_tickets:
        if mt.get("category") == ai_result["department"] and mt.get("status") != "resolved":
            distance = calculate_distance(lat, lng, mt.get("lat"), mt.get("lng"))
            if distance <= 30: # 30 meters threshold
                matched_ticket = mt
                break
            
    if matched_ticket:
        mt_id = matched_ticket["master_ticket_id"]
        print(f"[{complaint_id}] Clustered into existing Master Ticket {mt_id}")
        
        # In Mock DB update
        if db.use_mock:
            db._mock_master_tickets[mt_id]["impact_count"] = matched_ticket.get("impact_count", 1) + 1
            if "complaint_ids" not in db._mock_master_tickets[mt_id]:
                db._mock_master_tickets[mt_id]["complaint_ids"] = []
            db._mock_master_tickets[mt_id]["complaint_ids"].append(complaint_id)
            
        db.update_complaint(complaint_id, {"master_ticket_id": mt_id})
    else:
        print(f"[{complaint_id}] Creating NEW Master Ticket")
        
        # Calculate SLA deadline based on urgency tier
        tier = ai_result["urgency_tier"]
        sla_hours = 72 # default
        if tier == 5: sla_hours = 4
        elif tier == 4: sla_hours = 12
        elif tier == 3: sla_hours = 24
        
        sla_deadline = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat()
        
        mt_data = {
            "ward": ward,
            "lat": lat,
            "lng": lng,
            "category": ai_result["department"],
            "severity": "high" if tier >= 4 else "medium",
            "status": "open",
            "assigned_to": f"ward_officer_{ward}",
            "assigned_level": 1, # 1: Ward Officer, 2: Ward Exec, 3: Zonal
            "complaint_ids": [complaint_id],
            "sla_deadline": sla_deadline
        }
        mt_id = db.create_master_ticket(mt_data)
        db.update_complaint(complaint_id, {"master_ticket_id": mt_id})
        
    # 3. SMS Notification
    if phone:
        send_sms(phone, f"Your issue (#{complaint_id}) has been categorized as {ai_result['department']} and assigned to the local officer.")
