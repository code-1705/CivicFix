# CivicFix — Demo Video Recording Master Guide

## 1. System Health Verification Status
- **API & Frontend**: Live at `https://civicfix.duckdns.org` (SSL valid, Caddy auto-reverse-proxy).
- **Backend**: FastAPI running on EC2 (`13.62.222.37`, `eu-north-1`).
- **Amazon S3**: Bucket `civicfix-images-prod-551169295110` (`us-east-1`, Public Read active).
- **Amazon DynamoDB**: Tables `civicfix_complaints` and `civicfix_master_tickets` (`us-east-1`, Account `551169295110`).
- **AI Triage**: Autonomous spam filter & severity classifier active.

---

## 2. Excalidraw Architecture Layout (How to Draw It)

Open [excalidraw.com](https://excalidraw.com). Use a **clean 4-tier horizontal flow**:

```
[ Tier 1: Clients ] ──▶ [ Tier 2: AWS Edge & Compute ] ──▶ [ Tier 3: AI & Services ] ──▶ [ Tier 4: AWS Persistence ]
```

### Layout Elements:

#### **Tier 1: Clients & Users (Left, Blue Boxes)**
1. **Citizen PWA (Mobile/Desktop)**:
   - Tag: Photo upload + GPS coordinates + Mobile #
2. **Ward Officer Dashboard**:
   - Tag: SLA triage + Geofenced Before/After review
3. **Public Accountability Map**:
   - Tag: Real-time nationwide transparency

#### **Tier 2: AWS Edge & Compute (Center-Left, Purple Enclosure: "AWS Cloud (EC2)")**
- Outer Box: **AWS EC2 (t3.micro - Ubuntu 24.04)**
  - Box A: **Caddy Gateway** (Automatic Let's Encrypt HTTPS / Reverse Proxy)
  - Box B: **Next.js 14 Frontend** (SSR / Responsive UI)
  - Box C: **FastAPI Core Service** (Python 3.11, Async Worker Engine, Escalation Daemon)

#### **Tier 3: AI Triage & Telephony (Center-Right, Yellow/Orange Boxes)**
1. **AI Vision Triage Pipeline**:
   - Tag: Anti-Spam Gate (Confidence > 0.85) + Severity Classifier + Department Tagging
   - Architecture note: Amazon Bedrock / Vision API compatible
2. **Twilio SMS Gateway**:
   - Tag: Real-time SMS dispatch to citizen on queue / resolution

#### **Tier 4: AWS Persistence & Storage (Right, Green/AWS Orange Boxes)**
1. **Amazon S3 Bucket (`civicfix-images-prod-551169295110`)**:
   - Tag: Citizen Complaint Photos + Contractor Resolution Proofs
2. **Amazon DynamoDB NoSQL (`civicfix_complaints` & `civicfix_master_tickets`)**:
   - Tag: Sub-second state queries + Deduplication clustering + SLA deadline tracking

### Connection Arrows:
- Citizen PWA ──▶ Caddy / FastAPI (HTTPS POST)
- FastAPI ──▶ Amazon S3 (Upload raw image)
- FastAPI ──▶ AI Vision Engine (Triage image)
- AI Vision Engine ──▶ FastAPI (JSON: Category, Severity, Spam verdict)
- FastAPI ──▶ Amazon DynamoDB (Create ticket / cluster)
- FastAPI ──▶ Twilio (Send citizen SMS)
- Ward Officer ──▶ FastAPI ──▶ Amazon DynamoDB (Resolve ticket)

---

## 3. Browser Tabs Checklist (Before Hitting Record)

Set your browser window to **1920x1080** and open these exact tabs in order:

| Tab # | Name | URL | What It Shows |
|---|---|---|---|
| **Tab 1** | Architecture | [excalidraw.com](https://excalidraw.com) | Clean system diagram |
| **Tab 2** | Citizen Portal | `https://civicfix.duckdns.org` | Complaint submission form |
| **Tab 3** | Officer Dashboard | `https://civicfix.duckdns.org/ward/151` | Live tickets, SLA timers |
| **Tab 4** | AWS DynamoDB | [DynamoDB us-east-1 Console](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=civicfix_master_tickets) | `civicfix_master_tickets` rows |
| **Tab 5** | AWS S3 Bucket | [S3 us-east-1 Console](https://s3.console.aws.amazon.com/s3/buckets/civicfix-images-prod-551169295110?region=us-east-1&prefix=uploads/) | Uploaded images |
| **Tab 6** | AWS EC2 Console | [EC2 Stockholm (eu-north-1)](https://eu-north-1.console.aws.amazon.com/ec2/home?region=eu-north-1#Instances:) | Running instance `13.62.222.37` |

---

## 4. Word-For-Word Demo Script (Target: 2 min 40 sec)

### [0:00 - 0:25] Introduction & Problem
- **Tab**: Tab 1 (Excalidraw Diagram)
- **Voiceover**:
  > "Every monsoon, potholes break Indian roads, citizens file complaints into black-hole portals, and departments blame each other while contractors claim payments on phantom repairs.
  > This is **CivicFix** — an autonomous, fraud-proof civic issue triage and resolution platform built natively on AWS.
  > Let’s see the full loop running live on our AWS cloud deployment."

---

### [0:25 - 1:05] Autonomous AI Anti-Spam & Citizen Submission
- **Tab**: Switch to Tab 2 (`civicfix.duckdns.org`)
- **Action**:
  1. Click photo upload. Select a non-civic photo (screenshot or desktop icon). Click **Submit Complaint**.
  2. **Point to screen**: Show immediate red badge: *"Issue Rejected by Vision AI: Image does not show public municipal defect (Confidence: 99%)"*.
  3. Now select a real road pothole photo. Fill mobile number. Click **Submit Complaint**.
  4. **Point to screen**: Show green badge: *"Complaint #XXXX queued & accepted for automated triage"*.
- **Voiceover**:
  > "First, the anti-spam barrier. If someone uploads an irrelevant photo or troll image, our computer vision pipeline flags it with 99% confidence and rejects it instantly, saving municipal staff hours of manual triage.
  > Now, when a citizen uploads a legitimate crater on MG Road with geolocation, the backend queues it, generates a secure image hash, and kicks off async department classification."

---

### [1:05 - 1:45] Ward Officer Dashboard & Anti-Fraud Resolution
- **Tab**: Switch to Tab 3 (`civicfix.duckdns.org/ward/151`)
- **Action**:
  1. Refresh the page.
  2. Point to the newly created master ticket with SLA countdown timer (24 hrs) and assigned department (Public Works).
  3. Click **Resolve Ticket**.
  4. Upload repair photo and click **Verify & Close**.
- **Voiceover**:
  > "Now looking at the Ward 151 dashboard. The issue is clustered by GPS coordinates and assigned a strict SLA timer.
  > When the engineering team fixes the road, the contractor cannot just close the ticket with a fake checkbox. Our anti-fraud verification requires geo-tagged photographic proof before the ticket state transitions to resolved."

---

### [1:45 - 2:25] The AWS Proof (Essential for Judges)
- **Tab**: Switch to Tab 4 (DynamoDB), Tab 5 (S3), and Tab 6 (EC2)
- **Action**:
  1. In DynamoDB: Click **Run** on `civicfix_master_tickets`. Expand the ticket row. Point to `status: "resolved"`, GPS coordinates, `sla_deadline`.
  2. In S3: Click refresh on `civicfix-images-prod-551169295110/uploads/`. Point to the citizen photo and contractor proof objects.
  3. In EC2: Point to the running instance `13.62.222.37` behind automatic HTTPS.
- **Voiceover**:
  > "Here is our live AWS architecture powering this in real time:
  > In **Amazon DynamoDB**, complaints and master tickets are indexed in sub-second latency with zero serverless cold starts.
  > In **Amazon S3**, all citizen evidence and contractor resolution proofs are securely stored and versioned.
  > And the entire application is hosted on an **AWS EC2** instance with automated SSL reverse-proxying."

---

### [2:25 - 2:45] Impact & Conclusion
- **Tab**: Tab 1 (Excalidraw) or `https://civicfix.duckdns.org/explore`
- **Voiceover**:
  > "CivicFix replaces bureaucratic inertia with autonomous AI triage and tamper-proof verification on AWS. Transparent, fast, and scalable across every municipality in India.
  > Built for First Commit 2026. Thank you."

---

## 5. Hard Rules Reminder
- **Length**: MUST be under 3 minutes (2:40 is ideal).
- **Upload**: YouTube (Unlisted or Public).
- **Visibility**: Test link in incognito mode before submitting.
