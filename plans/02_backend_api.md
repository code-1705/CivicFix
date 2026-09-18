# Backend and API Subplan (Hackathon Optimized)

## 1. API Endpoints (FastAPI)
- **POST `/complain`**
  - *Input*: `multipart/form-data` with images, `lat`, `lng`, `mobile`.
  - *Action*: Uploads images to S3, generates `complaint_id`, saves to DB as `pending_triage`. Spawns a FastAPI `BackgroundTask` for AI processing instead of a heavy SQS queue.
  - *Output*: `202 Accepted` with `{ "complaint_id": "...", "status": "queued" }`.
- **POST `/login`**
  - *Input*: `wardNo` and `password`.
  - *Action*: Authenticates the officer for their assigned ward. Returns a JWT token.
  - *Output*: `200 OK` with `{ "token": "...", "wardNo": "..." }`.
- **GET `/ward_complain/{ward_number}`**
  - *Input*: Officer Auth token (JWT).
  - *Output*: List of `MasterTickets` for the specific ward, structured for the frontend dashboard.
- **GET `/status/{complaint_id}`**
  - *Output*: Citizen-facing view of the complaint (including linked master ticket status, AI explainability, and proof of resolution).
- **POST `/resolve/{master_ticket_id}`**
  - *Input*: `multipart/form-data` with proof photo, `lat`, `lng`.
  - *Action*: Validates officer Auth. Performs geofence check (**100m tolerance** to account for GPS drift, plus a hidden `?override=true` flag for demo safety). Marks ticket as resolved, updates linked complaints. Triggers Twilio SMS to citizen.

## 2. The AI Safety Valve
- Implement a `.env` variable: `USE_MOCK_AI=true`.
- If true, bypass Amazon Bedrock completely and return a perfectly formatted, hardcoded JSON response. This guarantees a flawless demo even if the venue Wi-Fi is terrible or AWS APIs time out.

## 3. Authentication & Authorization
- **Officers**: Simple JWT auth (or Cognito if time permits). 
- **Logic**: Enforce that an officer can only view and act on tickets where `ticket.ward == officer.ward`. Returns `403 Forbidden` if unauthorized.

## 4. Ward Determination Logic
- **Primary**: Point-in-polygon check mapping `lat, lng` to `ward_number`.
- **Fallback**: Reverse geocoding (Nominatim/Google Maps API) if polygon data is inconclusive.
