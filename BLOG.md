# CivicFix: Building an Autonomous Civic Issue Triage & Anti-Fraud Platform on AWS

Every monsoon across Indian cities, the same tragic story repeats itself: roads crack open, dangerous potholes swallow vehicles, and open drains overflow. Citizens report these hazards into municipal portals, only for complaints to disappear into a bureaucratic black hole. Meanwhile, different government departments point fingers at each other, and municipal contractors claim payouts for phantom repairs that were never physically completed.

To solve this systemic civic failure, I built **CivicFix** for the **WeMakeDevs AWS First Commit Hackathon 2026** — an autonomous, fraud-proof civic issue remediation and accountability engine powered by AWS cloud infrastructure and computer vision.

Here is the complete journey of how CivicFix was architected, built, and deployed live to production.

---

## The Core Problems in Municipal Grievance Redressal

Traditional civic complaint platforms suffer from four fatal bottlenecks:

1. **The Black-Hole Portal Problem**: Unfiltered portals are flooded with spam, duplicates, and irrelevant photos, forcing municipal staff to manually sift through thousands of entries.
2. **Inter-Departmental Finger-Pointing**: A water pipeline leak creating a pothole sits unresolved for months because the Water Supply Board and the Public Works Department pass the buck.
3. **Contractor Invoicing Fraud**: Public funds are drained by phantom repairs. Contractors mark issues "resolved" with a checkbox, collect taxpayer money, and leave roads broken.
4. **Zero Citizen Feedback**: Complainants receive no updates, eroding public trust in urban local bodies (ULBs).

---

## The Solution: How CivicFix Works

CivicFix transforms civic reporting into an autonomous, closed-loop pipeline:

```
[ Citizen PWA ] 
       │ (Photo + GPS + Mobile)
       ▼
[ AWS EC2 / Caddy Gateway ]
       │ 
       ├─────────────────────────────────┐
       ▼                                 ▼
[ AI Vision Triage Engine ]      [ Amazon S3 ]
  • Anti-Spam Gate (>95% Conf)     (Publicly accessible proof)
  • Hazard Severity Scoring
  • Department Classification
       │
       ▼
[ Amazon DynamoDB ]
  • Geospatial Clustering
  • SLA Countdown Engine (24-72h)
       │
       ▼
[ Ward Officer & Contractor Dashboard ]
  • Geofenced Visual Verification
  • Before/After Photo Audit
       │
       ▼
[ Citizen Notification (Twilio SMS) ]
```

### 1. Autonomous AI Vision Triage & Spam Filter
When a citizen snaps a photo of a hazard, the system doesn't just store it — it actively inspects it:
* **Spam & Troll Detection**: Irrelevant uploads (selfies, screenshots, household objects) are rejected with >95% confidence and a clear plain-English explanation.
* **Severity & Department Tagging**: Valid hazards are classified (e.g., Road Damage → Public Works, Overflowing Drain → Sanitation) and assigned a severity level (Critical, High, Medium, Low).

### 2. Geospatial Clustering into Master Tickets
Instead of creating 50 duplicate tickets for the same crater on MG Road, CivicFix calculates geographic proximity and clusters multiple citizen complaints into a single **Master Ticket**. Each new report increments the issue's **Impact Count**, dynamically boosting its priority.

### 3. Strict SLA Deadlines & Inter-Department Relay
Every Master Ticket starts a countdown timer based on severity (e.g., 24 hours for high-risk arterial potholes). If an officer determines that another agency is responsible, the **Department Relay Engine** logs the audit trail and transfers ownership without dropping the SLA clock.

### 4. Anti-Fraud "Proof of Resolution"
To prevent fake completion claims, the contractor or ward engineer cannot close a ticket with a checkbox. They **must upload an on-site photo of the completed repair**. The system pairs the citizen's original defect photo with the contractor's repair photo in a side-by-side audit view before funds can be certified.

---

## AWS Architecture & Implementation Details

CivicFix was designed from day one to be fully cloud-native, robust, and cost-effective on the **AWS Free Tier**:

### 1. Amazon DynamoDB (NoSQL Database)
* **Tables**: `civicfix_complaints` and `civicfix_master_tickets`.
* **Why DynamoDB**: Delivers single-digit millisecond latency with zero serverless cold-start delays. Its dynamic schemaless architecture allows tickets to seamlessly absorb evolving fields like `coupled_images`, `sla_deadline`, and `relay_history`.
* **Configuration**: Configured with `PAY_PER_REQUEST` billing to maximize cost efficiency without manual RCU/WCU provisioning.

### 2. Amazon S3 (Scalable Object Storage)
* **Bucket**: `civicfix-images-prod-551169295110`.
* **Why S3**: Provides 99.999999999% durability for citizen defect evidence and contractor resolution proofs.
* **Security & Performance**: Configured with granular bucket policies for public read access on image endpoints, allowing instant rendering across mobile browsers and national map explorers.

### 3. Amazon EC2 (Compute & Gateway)
* **Instance**: `t3.micro` running Ubuntu 24.04 LTS.
* **Container Stack**: Orchestrated using Docker Compose:
  * **Caddy Web Server**: Automated Let's Encrypt SSL/TLS certificates and reverse-proxying.
  * **FastAPI Backend (Python 3.11)**: Async worker engine handling AI triage, geospatial clustering, and Twilio SMS dispatch.
  * **Next.js 14 Web Frontend**: Responsive, modern user interface for citizens and municipal officers.

---

## What We Learned & Feedback on AWS

Building CivicFix in a weekend hackathon provided deep insights into AWS developer experience:

### What Worked Brilliantly:
* **DynamoDB On-Demand Mode**: Instant table creation with zero capacity planning let us move fast without fear of throttling.
* **S3 Reliability**: The Python `boto3` SDK made asset uploads and URL generation remarkably stable and predictable.
* **EC2 Freedom**: Having full root control over an EC2 instance allowed us to run multi-container Docker workloads behind custom DuckDNS domains in minutes.

### What Could Be Improved:
* **DynamoDB Python Type Casting**: `boto3` strictly enforces `Decimal` instead of Python `float`. Managing coordinate precision (`lat`, `lng`) required custom serialization workarounds.
* **S3 Public Read Onboarding**: Creating a public image bucket still requires navigating multiple disjointed steps (disabling Block Public Access, then authoring custom JSON bucket policies). A one-click preset for public static media in the creation wizard would be a huge developer convenience.

---

## Live Links & Code

* **Live Web Application**: [https://civicfix.duckdns.org](https://civicfix.duckdns.org)
* **Ward 151 Officer Dashboard**: [https://civicfix.duckdns.org/ward/151](https://civicfix.duckdns.org/ward/151)
* **National Explorer Map**: [https://civicfix.duckdns.org/explore](https://civicfix.duckdns.org/explore)
* **GitHub Repository**: [https://github.com/code-1705/CivicFix](https://github.com/code-1705/CivicFix)

---

## Conclusion

Civic infrastructure shouldn't take months to fix, and public money shouldn't disappear into phantom repair contracts. By combining autonomous vision AI with the speed, scalability, and durability of **Amazon DynamoDB, S3, and EC2**, CivicFix shows how modern cloud engineering can bring transparency, speed, and integrity to civic administration across India.
