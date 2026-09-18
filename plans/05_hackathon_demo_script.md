# Hackathon Demo Script (3-4 Minutes)

## Goal
To showcase the unique value propositions: AI triage, geographic clustering, SLA enforcement, closed-loop SMS, and verified resolution.

## Step 1: The Citizen Flow (0:00 - 0:45)
1. **Action**: Open the mobile app. Location permission prompt appears.
2. **Action**: Snap a picture of a pothole.
3. **Wow Moment**: The map preview shows the exact location. Drag the pin slightly to show that users can correct GPS drift. Hit Submit.
4. **Wow Moment (Audio)**: Your phone physically buzzes on stage with a Twilio SMS: *"Your pothole report has been analyzed by AI and assigned to the Public Works department."*

## Step 2: AI Triage & Explainability (0:45 - 1:30)
1. **Action**: Navigate to the public status page via the SMS link.
2. **Wow Moment**: Open the "Explainability Drawer". Show the AI's reasoning: "Pothole depth > 2 inches, Priority: High." *(Note: Behind the scenes, `USE_MOCK_AI=true` ensures this never fails).*

## Step 3: Geographic Clustering (1:30 - 2:00)
1. **Action**: Quickly submit a *second* complaint of the same issue nearby.
2. **Wow Moment**: The status page shows: "Linked to Master Ticket. 2 citizens have reported this." Duplicates eliminated.

## Step 4: SLA Escalation & Security (2:00 - 2:45)
1. **Action**: Log in as Ward Officer for Ward A. Attempt to resolve a ticket from Ward B.
2. **Wow Moment**: Show the immediate `403 Forbidden` error. 
3. **Action**: Log in as the correct Ward Officer.
4. **Wow Moment**: Trigger the "Fast-Forward SLA" button. Show the ticket turn red and automatically escalate to the Zonal Commissioner.

## Step 5: Proof of Resolution (2:45 - 3:30)
1. **Action**: Click "Resolve". Upload an "After" photo.
2. **Wow Moment**: The system verifies the officer's GPS (use the hidden override if needed). 
3. **Closing Loop**: Your phone buzzes again with a final Twilio SMS: *"Your issue is resolved. View proof here."* Show the side-by-side Before/After photos on the public page.
