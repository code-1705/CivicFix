# AI Triage & Geospatial Clustering Subplan (Hackathon Optimized)

## 1. AI Triage Worker (FastAPI Background Task)
- **Trigger**: Spawns immediately after `/complain` returns 202.
- **Process**:
  1. Check `USE_MOCK_AI` env variable. If true, instantly return mock data.
  2. If false, construct prompt and send images + ward data to Amazon Bedrock.
  3. Parse AI response expecting JSON: `{ "department": "...", "description": "...", "confidence": 0.xx, "urgency_tier": 1-5, "reasoning": "..." }`.
  4. Trigger SMS to user: "Your issue has been categorized as [Department] and assigned to the local officer."

## 2. Geospatial Clustering (30m Radius)
- **Goal**: Group duplicate complaints into a single `MasterTicket`.
- **Process**:
  1. Query DynamoDB for open `MasterTickets` in the same `ward`.
  2. Narrow candidates using a **Geohash prefix**.
  3. Calculate precise distance using **Haversine formula**.
  4. If a master ticket is found within 30m with a matching category:
     - Append `complaint_id` to master ticket.
     - Increment `impact_count` and potentially bump `severity`.
  5. If no match:
     - Create a NEW `MasterTicket`.
     - Calculate and set `sla_deadline` based on `urgency_tier`.

## 3. Automated Escalation Engine
- **Hierarchical Levels**: Ward Officer -> Ward Executive -> Zonal Commissioner.
- **Logic**:
  - A polling script scans for missed SLAs.
  - **At 75%**: Send warning notification to current assignee.
  - **At 100%**: Escalate to next level, log audit trail, notify.
