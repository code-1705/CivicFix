import asyncio
from datetime import datetime, timezone
from database import db
from services.ai_triage import send_sms

async def escalation_engine():
    """
    Background worker that periodically checks for SLA breaches and escalates tickets.
    """
    print("🚀 Escalation Engine Started...")
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Fetch all open tickets (In a real app, query by status='open')
            # For hackathon mock, iterate over all tickets
            if db.use_mock:
                open_tickets = [t for t in db._mock_master_tickets.values() if t.get("status") != "resolved"]
            else:
                # Real DynamoDB scan/query
                open_tickets = []
                
            for mt in open_tickets:
                if "sla_deadline" not in mt:
                    continue
                    
                deadline = datetime.fromisoformat(mt["sla_deadline"])
                
                # Calculate percentages
                created = datetime.fromisoformat(mt["created_at"])
                total_duration = (deadline - created).total_seconds()
                elapsed = (now - created).total_seconds()
                
                percentage = (elapsed / total_duration) * 100 if total_duration > 0 else 100
                
                current_level = mt.get("assigned_level", 1)
                mt_id = mt["master_ticket_id"]
                
                # 100% SLA Breach -> Escalate
                if percentage >= 100 and current_level == 1:
                    print(f"🚨 SLA BREACH on {mt_id}! Escalating to Level 2 (Ward Executive).")
                    if db.use_mock:
                        db._mock_master_tickets[mt_id]["assigned_level"] = 2
                        db._mock_master_tickets[mt_id]["assigned_to"] = f"ward_executive_{mt['ward']}"
                    # Simulate notifying new assignee
                    # send_sms("executive_phone", f"Ticket {mt_id} breached SLA and was escalated to you.")
                    
                # 150% SLA Breach -> Escalate further
                elif percentage >= 150 and current_level == 2:
                    print(f"🚨🚨 CRITICAL SLA BREACH on {mt_id}! Escalating to Level 3 (Zonal).")
                    if db.use_mock:
                        db._mock_master_tickets[mt_id]["assigned_level"] = 3
                        db._mock_master_tickets[mt_id]["assigned_to"] = "zonal_commissioner"
                        
                # 75% Warning
                elif percentage >= 75 and percentage < 100 and not mt.get("warning_sent"):
                    print(f"⚠️ SLA WARNING on {mt_id}: 75% time elapsed.")
                    if db.use_mock:
                        db._mock_master_tickets[mt_id]["warning_sent"] = True

        except Exception as e:
            print(f"Error in Escalation Engine: {e}")
            
        # Sleep before next poll (run every 10 seconds for demo speed)
        await asyncio.sleep(10)
