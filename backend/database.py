import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

USE_MOCK_DB = os.getenv("USE_MOCK_DB", "true").lower() == "true"

class DatabaseRepository:
    def __init__(self):
        self.use_mock = USE_MOCK_DB
        if self.use_mock:
            print("WARNING: Using MOCK IN-MEMORY DATABASE.")
            self._mock_complaints = {}
            self._mock_master_tickets = {}
            self._mock_officers = {
                "officer1": {"officer_id": "officer1", "ward": "151", "role": "ward_officer", "password_hash": "mockhash"}
            }
        else:
            print("Connecting to real AWS DynamoDB...")
            # Import boto3 here to avoid requiring it if just testing locally
            import boto3
            self.dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION"))
            self.complaints_table = self.dynamodb.Table(os.getenv("DYNAMODB_TABLE_COMPLAINTS"))
            self.tickets_table = self.dynamodb.Table(os.getenv("DYNAMODB_TABLE_MASTER_TICKETS"))

    # --- Complaints ---
    def create_complaint(self, data: dict) -> str:
        complaint_id = str(uuid.uuid4())[:6].upper() # 6 char alphanumeric for hackathon
        data["complaint_id"] = complaint_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        if self.use_mock:
            self._mock_complaints[complaint_id] = data
        else:
            self.complaints_table.put_item(Item=data)
            
        return complaint_id

    def get_complaint(self, complaint_id: str) -> Optional[dict]:
        if self.use_mock:
            return self._mock_complaints.get(complaint_id)
        else:
            response = self.complaints_table.get_item(Key={"complaint_id": complaint_id})
            return response.get("Item")

    def update_complaint(self, complaint_id: str, updates: dict):
        if self.use_mock:
            if complaint_id in self._mock_complaints:
                self._mock_complaints[complaint_id].update(updates)
        else:
            # Complex update expression builder needed for real DynamoDB
            pass

    # --- Master Tickets ---
    def get_master_tickets_by_ward(self, ward: str) -> List[dict]:
        if self.use_mock:
            return [t for t in self._mock_master_tickets.values() if t.get("ward") == ward]
        else:
            # Requires GSI query in DynamoDB
            return []

    def create_master_ticket(self, data: dict) -> str:
        ticket_id = f"MT-{str(uuid.uuid4())[:6].upper()}"
        data["master_ticket_id"] = ticket_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["impact_count"] = 1
        
        if self.use_mock:
            self._mock_master_tickets[ticket_id] = data
        else:
            self.tickets_table.put_item(Item=data)
            
        return ticket_id

# Create a singleton instance to be imported by routes
db = DatabaseRepository()
