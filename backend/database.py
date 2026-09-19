import os
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

USE_MOCK_DB = os.getenv("USE_MOCK_DB", "true").lower() == "true"
MOCK_DB_FILE = os.path.join(os.path.dirname(__file__), "mock_db_store.json")

class DatabaseRepository:
    def __init__(self):
        self.use_mock = USE_MOCK_DB
        if self.use_mock:
            self._mock_complaints = {}
            self._mock_master_tickets = {}
            self._mock_officers = {
                "officer1": {"officer_id": "officer1", "ward": "151", "role": "ward_officer", "password_hash": "mockhash"}
            }
            self._load_mock_store()
        else:
            print("Connecting to real AWS DynamoDB...")
            import boto3
            self.dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION"))
            self.complaints_table = self.dynamodb.Table(os.getenv("DYNAMODB_TABLE_COMPLAINTS"))
            self.tickets_table = self.dynamodb.Table(os.getenv("DYNAMODB_TABLE_MASTER_TICKETS"))

    def _load_mock_store(self):
        if os.path.exists(MOCK_DB_FILE):
            try:
                with open(MOCK_DB_FILE, "r", encoding="utf-8") as f:
                    store = json.load(f)
                    self._mock_complaints = store.get("complaints", {})
                    self._mock_master_tickets = store.get("master_tickets", {})
            except Exception as e:
                print("Error loading mock DB store:", e)

    def _save_mock_store(self):
        try:
            with open(MOCK_DB_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "complaints": self._mock_complaints,
                    "master_tickets": self._mock_master_tickets
                }, f, indent=2)
        except Exception as e:
            print("Error saving mock DB store:", e)

    # --- Complaints ---
    def create_complaint(self, data: dict) -> str:
        complaint_id = str(uuid.uuid4())[:6].upper()
        data["complaint_id"] = complaint_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        if self.use_mock:
            self._mock_complaints[complaint_id] = data
            self._save_mock_store()
        else:
            self.complaints_table.put_item(Item=data)
            
        return complaint_id

    def get_complaint(self, complaint_id: str) -> Optional[dict]:
        if self.use_mock:
            self._load_mock_store()
            return self._mock_complaints.get(complaint_id)
        else:
            response = self.complaints_table.get_item(Key={"complaint_id": complaint_id})
            return response.get("Item")

    def update_complaint(self, complaint_id: str, updates: dict):
        if self.use_mock:
            self._load_mock_store()
            if complaint_id in self._mock_complaints:
                self._mock_complaints[complaint_id].update(updates)
                self._save_mock_store()
        else:
            pass

    # --- Master Tickets ---
    def get_master_tickets_by_ward(self, ward: str) -> List[dict]:
        if self.use_mock:
            self._load_mock_store()
            return [t for t in self._mock_master_tickets.values() if t.get("ward") == ward]
        else:
            return []

    def create_master_ticket(self, data: dict) -> str:
        ticket_id = f"MT-{str(uuid.uuid4())[:6].upper()}"
        data["master_ticket_id"] = ticket_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        # Ensure impact_count starts at 1 (the originating complaint)
        data.setdefault("impact_count", 1)
        if self.use_mock:
            self._mock_master_tickets[ticket_id] = data
            self._save_mock_store()
        else:
            self.tickets_table.put_item(Item=data)
            
        return ticket_id

    def update_master_ticket(self, ticket_id: str, updates: dict):
        if self.use_mock:
            self._load_mock_store()
            if ticket_id in self._mock_master_tickets:
                self._mock_master_tickets[ticket_id].update(updates)
                self._save_mock_store()
        else:
            pass

    def add_complaint_to_master_ticket(self, ticket_id: str, complaint_id: str):
        if self.use_mock:
            self._load_mock_store()
            if ticket_id in self._mock_master_tickets:
                t = self._mock_master_tickets[ticket_id]
                t["impact_count"] = t.get("impact_count", 1) + 1
                if "complaint_ids" not in t:
                    t["complaint_ids"] = []
                if complaint_id not in t["complaint_ids"]:
                    t["complaint_ids"].append(complaint_id)
                self._save_mock_store()
        else:
            pass

# Create a singleton instance to be imported by routes
db = DatabaseRepository()
