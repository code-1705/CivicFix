# Frontend & Mobile Subplan (Hackathon Optimized)

## 1. Tech Stack
- **Framework**: Next.js (React) + TailwindCSS.
- **Hosting**: Vercel (instant deployment).
- **Design Philosophy**: Mobile-first, vibrant colors, clear typography, micro-animations for interactions.

## 2. Citizen Flow (No Login Required)
- **Home Route (`/`)**: 
  - Immediate request for Location Permission on load.
  - Massive, friendly "Report Issue" CTA.
  - Access camera for immediate photo upload.
  - **GPS Verification**: Display a small interactive map preview with a draggable pin. User can manually correct their location if HTML5 Geolocation drifts.
  - Submit button.
  - Redirects to status page with `complaint_id`.

## 3. Public Status Page (`/status/[complaint_id]`)
- **Explainability Drawer**: Highlights AI's categorization, reasoning, and confidence score.
- **Community Impact**: "X other citizens reported this - Priority Bumped!"
- **SLA Timeline**: Visual progress bar for resolution deadline.
- **Resolution Proof**: Displays Before & After photos uploaded by the officer.

## 4. Officer Login & Dashboard (Protected Routes)
- **Hidden Login Route (`/login`)**:
  - Requires `wardNo` and `password`.
  - **Crucial Rule**: Do NOT add a login button to the base citizen page (`/`). Officers navigate here directly via URL.
- **Industry-Standard Dashboard (`/ward/[ward_number]`)**: 
  - **Metrics Row**: Top-level cards showing "Open Tickets", "Nearing SLA Breach", and "Resolved Today".
  - **Data Table**: List of `MasterTickets` assigned to the ward, color-coded by urgency (Red for SLA breach warning).
- **Action Flow**:
  - Click "Resolve & Mark Done" -> Opens camera for After photo + captures officer's GPS.
  - **Demo Safety**: Include a hidden "Override GPS" button for the presentation in case the indoor venue blocks accurate GPS signals.
