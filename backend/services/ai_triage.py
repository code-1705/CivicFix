import os
import json
import time
from datetime import datetime, timedelta, timezone
from database import db

from services.sms_service import send_sms

def process_complaint_task(complaint_id: str, ward: str, lat: float, lng: float, phone: str, image_paths: list = None):
    """
    This runs in the background. It analyzes uploaded images using OpenAI Vision,
    validates whether a genuine civic issue is present, and either auto-closes
    invalid reports or clusters & creates tickets for real issues.
    """
    print(f"[*] Starting process_complaint_task for #{complaint_id} with images={image_paths}...", flush=True)
    import base64
    import mimetypes

    use_mock_ai = os.getenv("USE_MOCK_AI", "true").lower() == "true"
    
    # 1. AI Triage with Vision
    if use_mock_ai:
        print(f"[{complaint_id}] Triage: Using Mock AI...")
        time.sleep(2) # simulate network delay
        ai_result = {
            "is_real_issue": True,
            "department": "Public Works",
            "description": "Large pothole in the middle of the road, dangerous for two-wheelers.",
            "confidence": 0.94,
            "urgency_tier": 4,
            "reasoning": "Depth > 2 inches, high traffic area."
        }
    else:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        if openai_api_key and openai_api_key != "your_openai_api_key_here":
            print(f"[{complaint_id}] Triage: Using OpenAI Vision API ({openai_model})...")
            import urllib.request
            import urllib.error

            # Prepare image content block if images exist
            content_list = []
            
            prompt_text = (
                f"You are an automated civic issue triage AI for municipal governance. "
                f"Examine the attached image(s) reported by a citizen at lat={lat}, lng={lng} in Ward {ward}.\n\n"
                f"Carefully determine:\n"
                f"1. Is this a REAL civic/municipal infrastructure or public hazard issue? "
                f"Set 'is_real_issue' to true ONLY if the image shows genuine municipal problems such as: "
                f"potholes, road/pavement damage, open manholes, garbage heaps/overflowing bins, broken streetlights, "
                f"water pipeline bursts/leaks, sewage overflow, or fallen trees blocking public paths.\n"
                f"2. If the image is a random selfie, animal/pet, inside a private home, a clear/normal road with no defect, "
                f"a food photo, meme, screenshot, or unrelated object, set 'is_real_issue' to false and provide a polite, "
                f"clear explanation in 'rejection_reason' explaining why it cannot be accepted as a municipal civic issue.\n\n"
                f"Output strictly valid JSON with keys:\n"
                f"- is_real_issue (boolean: true or false)\n"
                f"- department (string: 'Public Works', 'Sanitation', 'Water Supply', 'Electricity', or 'None')\n"
                f"- description (string: concise 1-2 sentence description of what is visible)\n"
                f"- confidence (float between 0.50 and 0.99)\n"
                f"- urgency_tier (integer 1-5, where 5 is critical emergency hazard)\n"
                f"- reasoning (string: clear reasoning based purely on visual evidence in the image)\n"
                f"- rejection_reason (string: if is_real_issue is false, explain why this report was closed)"
            )
            
            content_list.append({"type": "text", "text": prompt_text})

            if image_paths:
                for img_p in image_paths[:5]: # Send up to 5 images
                    if os.path.exists(img_p):
                        mime_type, _ = mimetypes.guess_type(img_p)
                        if not mime_type:
                            mime_type = "image/jpeg"
                        try:
                            with open(img_p, "rb") as img_f:
                                b64_data = base64.b64encode(img_f.read()).decode("utf-8")
                            content_list.append({
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{b64_data}",
                                    "detail": "low"
                                }
                            })
                        except Exception as read_err:
                            print(f"Error reading image {img_p}: {read_err}")

            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {openai_api_key}"
            }

            def execute_openai_request(target_model: str):
                payload = {
                    "model": target_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a civic issue triage and verification AI for municipal governance. Always return valid JSON."
                        },
                        {
                            "role": "user",
                            "content": content_list
                        }
                    ],
                    "response_format": {"type": "json_object"}
                }
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=30) as response:
                    body = response.read().decode("utf-8")
                    return json.loads(body)

            try:
                try:
                    response_json = execute_openai_request(openai_model)
                except urllib.error.HTTPError as he:
                    err_body = he.read().decode('utf-8', errors='ignore') if hasattr(he, 'read') else str(he)
                    if ("model" in err_body.lower() or he.code in (400, 404)) and openai_model != "gpt-4o-mini":
                        print(f"[*] Model '{openai_model}' failed ({he.code}). Falling back to 'gpt-4o-mini'...")
                        response_json = execute_openai_request("gpt-4o-mini")
                    else:
                        raise he
                result_str = response_json["choices"][0]["message"]["content"]
                ai_result = json.loads(result_str)
            except urllib.error.HTTPError as he:
                err_body = he.read().decode('utf-8', errors='ignore') if hasattr(he, 'read') else str(he)
                print(f"OpenAI HTTP error: {he.code} {he.reason}: {err_body}")
                ai_result = {
                    "is_real_issue": False,
                    "department": "None",
                    "description": "Error during vision analysis",
                    "confidence": 0.5,
                    "urgency_tier": 1,
                    "reasoning": f"OpenAI HTTP error {he.code}: {err_body}",
                    "rejection_reason": f"AI review error: {err_body[:100]}"
                }
            except Exception as e:
                print(f"OpenAI API error: {e}")
                ai_result = {
                    "is_real_issue": False,
                    "department": "None",
                    "description": "Error during vision analysis",
                    "confidence": 0.5,
                    "urgency_tier": 1,
                    "reasoning": f"Vision analysis request failed: {str(e)}",
                    "rejection_reason": "Unable to verify the image due to an internal processing error."
                }
        else:
            ai_result = {
                "is_real_issue": False,
                "department": "None",
                "description": "No valid API keys provided",
                "confidence": 0.5,
                "urgency_tier": 1,
                "reasoning": "Missing API keys.",
                "rejection_reason": "AI triage unavailable."
            }

    is_real = ai_result.get("is_real_issue", True)
    
    # If the AI determines the image does NOT show a real civic issue:
    if not is_real:
        rejection_msg = ai_result.get("rejection_reason") or ai_result.get("reasoning") or "No municipal issue detected in the uploaded photo."
        print(f"[{complaint_id}] Issue REJECTED by AI: {rejection_msg}")
        
        db.update_complaint(complaint_id, {
            "status": "closed",
            "triage_status": "rejected",
            "department": ai_result.get("department", "None"),
            "confidence": ai_result.get("confidence", 0.9),
            "reasoning": ai_result.get("reasoning", rejection_msg),
            "rejection_reason": rejection_msg,
            "closed_at": datetime.now(timezone.utc).isoformat()
        })
        
        if phone:
            send_sms(phone, f"{complaint_id} closed")
        return

    # Valid civic issue: Update complaint with triage data
    db.update_complaint(complaint_id, {
        "status": "triaged",
        "triage_status": "complete",
        **ai_result
    })
    
    # 2. Geographic Clustering (30m Haversine Logic)
    import math

    def calculate_distance(lat1, lon1, lat2, lon2):
        return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111139

    master_tickets = db.get_master_tickets_by_ward(ward)
    matched_ticket = None
    
    for mt in master_tickets:
        if mt.get("category") == ai_result.get("department") and mt.get("status") != "resolved":
            distance = calculate_distance(lat, lng, mt.get("lat"), mt.get("lng"))
            if distance <= 100: # 100 meters threshold
                matched_ticket = mt
                break
            
    if matched_ticket:
        mt_id = matched_ticket["master_ticket_id"]
        print(f"[{complaint_id}] Clustered into existing Master Ticket {mt_id}", flush=True)
        db.add_complaint_to_master_ticket(mt_id, complaint_id)
        db.update_complaint(complaint_id, {"master_ticket_id": mt_id})
    else:
        print(f"[{complaint_id}] Creating NEW Master Ticket", flush=True)
        
        tier = ai_result.get("urgency_tier", 3)
        sla_hours = 72
        if tier == 5: sla_hours = 4
        elif tier == 4: sla_hours = 12
        elif tier == 3: sla_hours = 24
        
        sla_deadline = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat()
        
        mt_data = {
            "ward": ward,
            "lat": lat,
            "lng": lng,
            "category": ai_result.get("department", "Public Works"),
            "severity": "high" if tier >= 4 else "medium",
            "status": "open",
            "assigned_to": f"ward_officer_{ward}",
            "assigned_level": 1,
            "complaint_ids": [complaint_id],
            "sla_deadline": sla_deadline
        }
        mt_id = db.create_master_ticket(mt_data)
        db.update_complaint(complaint_id, {"master_ticket_id": mt_id})
        
    # 3. SMS Notification (Intermediate SMS omitted to match exact user flow: submission ID -> rejection or resolution)
    pass
