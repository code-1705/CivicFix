import os
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import math
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
            region = os.getenv("AWS_REGION", "us-east-1")
            self.dynamodb = boto3.resource('dynamodb', region_name=region)
            c_table = os.getenv("DYNAMODB_TABLE_COMPLAINTS") or "civicfix_complaints"
            t_table = os.getenv("DYNAMODB_TABLE_MASTER_TICKETS") or "civicfix_master_tickets"
            self.complaints_table = self.dynamodb.Table(c_table)
            self.tickets_table = self.dynamodb.Table(t_table)

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

    def get_all_master_tickets(
        self,
        city: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> dict:
        if self.use_mock:
            self._load_mock_store()
            tickets = list(self._mock_master_tickets.values())
        else:
            try:
                response = self.tickets_table.scan()
                tickets = response.get("Items", [])
            except Exception:
                tickets = []

        enriched = []
        for t in tickets:
            item = dict(t)
            if "city" not in item:
                item["city"] = "Bengaluru"
            if "assigned_department" not in item:
                item["assigned_department"] = item.get("category", "Public Works")

            coupled_images = []
            for cid in t.get("complaint_ids", []):
                comp = self.get_complaint(cid)
                if comp:
                    urls = comp.get("image_urls") or ([comp.get("image_url")] if comp.get("image_url") else [])
                    for u in urls:
                        if u and u not in coupled_images:
                            coupled_images.append(u)
            item["coupled_images"] = coupled_images
            enriched.append(item)

        filtered = enriched
        if city and city.lower() != "all":
            filtered = [t for t in filtered if t.get("city", "").lower() == city.lower()]
        if department and department.lower() != "all":
            filtered = [
                t for t in filtered
                if department.lower() in t.get("assigned_department", "").lower()
                or department.lower() in t.get("category", "").lower()
            ]
        if status and status.lower() != "all":
            filtered = [t for t in filtered if t.get("status", "").lower() == status.lower()]
        if search:
            q = search.lower().strip()
            filtered = [
                t for t in filtered
                if q in t.get("master_ticket_id", "").lower()
                or q in t.get("category", "").lower()
                or q in t.get("assigned_department", "").lower()
                or q in str(t.get("ward", "")).lower()
                or q in t.get("city", "").lower()
            ]

        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        total = len(filtered)
        start_idx = (page - 1) * limit
        paginated_items = filtered[start_idx:start_idx + limit]

        total_tickets = len(tickets)
        resolved_count = sum(1 for t in tickets if t.get("status") == "resolved")
        active_count = sum(1 for t in tickets if t.get("status") != "resolved")

        # Calculate exact average resolution hours from ticket timestamps
        resolution_hours = []
        for t in tickets:
            if t.get("status") == "resolved" and t.get("resolved_at") and t.get("created_at"):
                try:
                    c_dt = datetime.fromisoformat(t["created_at"])
                    r_dt = datetime.fromisoformat(t["resolved_at"])
                    h = (r_dt - c_dt).total_seconds() / 3600.0
                    if h >= 0:
                        resolution_hours.append(h)
                except Exception:
                    pass

        avg_hours = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else 0.0

        return {
            "items": paginated_items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": max(1, math.ceil(total / limit)) if limit > 0 else 1,
            "stats": {
                "total_issues": total_tickets,
                "resolved_issues": resolved_count,
                "active_issues": active_count,
                "avg_resolution_hours": avg_hours
            }
        }

    def get_all_map_pins(self) -> List[dict]:
        if self.use_mock:
            self._load_mock_store()
            tickets = list(self._mock_master_tickets.values())
        else:
            try:
                response = self.tickets_table.scan()
                tickets = response.get("Items", [])
            except Exception:
                tickets = []

        pins = []
        for t in tickets:
            pins.append({
                "id": t.get("master_ticket_id"),
                "lat": t.get("lat"),
                "lng": t.get("lng"),
                "category": t.get("category", "Public Works"),
                "department": t.get("assigned_department") or t.get("category", "Public Works"),
                "severity": t.get("severity", "medium"),
                "status": t.get("status", "open"),
                "ward": t.get("ward", "151"),
                "city": t.get("city", "Bengaluru"),
                "resolved_image_url": t.get("resolved_image_url"),
                "created_at": t.get("created_at"),
                "impact_count": t.get("impact_count", 1)
            })
        return pins

    def relay_ticket(
        self,
        master_ticket_id: str,
        to_department: str,
        officer_id: str,
        notes: Optional[str] = None
    ) -> Optional[dict]:
        if self.use_mock:
            self._load_mock_store()
            if master_ticket_id not in self._mock_master_tickets:
                return None
            ticket = self._mock_master_tickets[master_ticket_id]
            from_dept = ticket.get("assigned_department") or ticket.get("category", "Public Works")

            relay_entry = {
                "from_department": from_dept,
                "to_department": to_department,
                "relayed_by": officer_id,
                "relayed_at": datetime.now(timezone.utc).isoformat(),
                "notes": notes or "Department handover for technical execution"
            }
            if "relay_history" not in ticket:
                ticket["relay_history"] = []
            ticket["relay_history"].append(relay_entry)
            ticket["assigned_department"] = to_department
            self._save_mock_store()
            return ticket
        else:
            return None

# Create a singleton instance to be imported by routes
db = DatabaseRepository()
