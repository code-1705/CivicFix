# Infrastructure and Database Subplan (Hackathon Optimized)

## 1. Cloud Architecture (AWS & Third-Party)
- **API Layer**: FastAPI application hosted on AWS App Runner, Vercel, or simply EC2/Lightsail for a quick hackathon deployment.
- **Compute (Workers)**: Use **FastAPI `BackgroundTasks`** for asynchronous AI processing to save time. *Note: Pitch SQS and dedicated worker Lambdas as the "V2 Production Architecture" during the presentation.*
- **Storage**: Amazon S3 for storing raw images and resolution proof images. Use presigned URLs for secure upload/download.
- **Database**: DynamoDB for fast NoSQL data storage.
- **Notifications**: **Twilio SMS API** to close the feedback loop with the citizen.

## 2. Database Schema (DynamoDB)
- **Table: Complaints**
  - `PK`: `complaint_id`
  - `Attributes`: `master_ticket_id`, `ward`, `lat`, `lng`, `images[]`, `mobile`, `status`, `created_at`, `triage_status`, `department`, `description`, `confidence`, `urgency_tier`
- **Table: MasterTickets**
  - `PK`: `master_ticket_id`
  - `Attributes`: `ward`, `lat`, `lng`, `category`, `impact_count`, `complaint_ids[]`, `severity`, `status`, `assigned_to`, `sla_deadline`, `created_at`, `last_updated`
- **Table: OfficerUsers**
  - `PK`: `officer_id`
  - `Attributes`: `role`, `ward`, `contact_info`
- **Global Secondary Indexes (GSIs)**
  - `WardIndex`: On `ward` for both `Complaints` and `MasterTickets` to enable fast queue fetching for officers.

## 3. SLA Tracking Mechanism
- **EventBridge/Cron Scheduler**: A scheduled task (or simple polling thread) running every X minutes to query `MasterTickets` where `status != 'resolved'` and `sla_deadline` is approaching or past due.
- Trigger warnings at 75% of SLA and escalate at 100%, 150%, and 200%.
