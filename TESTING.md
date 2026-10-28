# CampusShare — Step-by-Step QA Testing & Evaluation Guide

**Target Environment:** Localhost & Production Vercel  
**Local Test Server:** [http://localhost:3001](http://localhost:3001) (or `http://localhost:3000`)  
**Live Deployed Vercel URL:** [https://github.com/Sumaan0104/Hackathon.git](https://github.com/Sumaan0104/Hackathon.git) *(Mapped to Vercel production deployment)*  
**Repository:** [https://github.com/Sumaan0104/Hackathon.git](https://github.com/Sumaan0104/Hackathon.git)  

---

## 🔑 Demo Personas & Credentials

All 4 test personas are pre-seeded in the database with one-click sign-in buttons available on [`/login`](http://localhost:3001/login) and via the top-right persona switcher in the navigation bar.

| Role | Persona Name | Email Address | Password | Role Description & Testing Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Certified Borrower (`user`)** | **Alex Rivera** | `user1@demo.com` | `DemoPassword123!` | Holds Laser Tier-2, Field Camera, and Makerspace certifications. Used for standard reservations, check-ins, and returns. |
| **Uncertified Student (`user`)** | **Jordan Lee** | `user2@demo.com` | `DemoPassword123!` | Holds **zero** safety certifications. Used for testing the certificate eligibility blocking gate. |
| **Facility Custodian (`owner`)** | **Prof. Elena Vance** | `owner@demo.com` | `DemoPassword123!` | Department custodian managing Photonics Lab, Cinema Gear, and Makerspace. Used for `/owner/requests` review desk and incident resolution. |
| **Campus Dean (`admin`)** | **Dr. Sarah Chen** | `admin@demo.com` | `DemoPassword123!` | Dean with university-wide governance authority, full audit log inspection, and demo fixture reset privileges. |

---

## 🧪 Step-by-Step Testing Walkthrough

---

### Step 1: Certificate Prerequisite & Eligibility Gate
**Goal:** Verify that a student lacking required safety certifications cannot reserve specialized facilities.

1. In the top navigation bar, switch persona to **Jordan Lee (`user2@demo.com`)**.
2. On the home page, locate **Photonics & Laser Spectroscopy Lab (Room 304)**.
3. Click **"Reserve Slot"**:
   - Observe the red alert banner: `Eligibility Blocked: You're missing: Laser Safety Tier-2 Certification`.
   - The submit button is disabled.
4. Try typing a purpose and forcing submission:
   - The server rejects the action with: `Eligibility Blocked: You're missing: Laser Safety Tier-2 Certification.`

---

### Step 2: Request Booking & 6.0-Hour Weekly Quota Validation
**Goal:** Verify operating hours validation, maximum duration limits, and fair-use weekly caps.

1. Switch persona in the top navigation to **Alex Rivera (`user1@demo.com`)**.
2. Click **"Reserve Slot"** on **Sony FX6 Full-Frame Cinema Camera Kit**:
   - Notice the operating hours are `09:00 - 18:00`.
3. Try selecting a duration of **5.0 hours** (e.g. 10:00 to 15:00):
   - Notice the rule error: `Exceeds maximum booking limit of 4.0 hours.`
4. Try selecting a time outside operating hours (e.g. 07:00 to 09:00):
   - Notice the rule error: `Booking time is outside operating hours (09:00 to 18:00).`
5. Select a valid 2-hour slot (e.g., tomorrow 10:00 to 12:00) and enter an academic purpose:
   - Notice the live quota tracker showing weekly quota progress towards the **6.0-hour cap**.
6. Submit the reservation:
   - Status is set to **`pending`**.
   - `BOOKING_REQUESTED` is committed to the server `audit_log`.

---

### Step 3: Conflict Detection & Least-Recent-Use (LRU) Waitlist
**Goal:** Verify clash detection against approved bookings and prioritized waitlist queueing.

1. As **Alex Rivera (`user1@demo.com`)**, attempt to reserve a slot that overlaps with an already approved session.
2. The modal detects the overlap in real time:
   - Displays: `Conflict: Slot overlaps with an approved booking by [Name]`.
3. Click **"Join Fair-Access Waitlist"**:
   - The server calculates your waitlist priority ordered by **least recent use (LRU)**.
   - Status updates to **`waitlisted`** with your exact queue position.
   - `WAITLIST_JOINED` is written to `audit_log`.

---

### Step 4: Server-Gated Owner Review Portal (`/owner/requests`)
**Goal:** Verify server-side role access control, 10-character reason validation, and clash re-checking.

1. Switch persona to **Jordan Lee (`user2@demo.com`)** (plain student).
2. Attempt to open [`/owner/requests`](http://localhost:3001/owner/requests):
   - You will see the **403 Access Restricted** security screen. Pending requests are blocked on the server.
3. Switch persona to **Prof. Elena Vance (`owner@demo.com`)**:
   - Navigate to [`/owner/requests`](http://localhost:3001/owner/requests).
   - Review pending requests displaying: Requester name, department, certifications held vs required, 6.0h quota progress bar, and waitlist position.
4. Select **Approve**:
   - Type `OK` (< 10 chars) — observe the disabled submit button and live character counter: `2 / 10 min characters`.
5. Enter a valid written justification ($\ge 10$ chars), e.g. `Approved following lab safety orientation`:
   - Click **"Authorize Decision"**.
   - The server re-checks schedule clashes and weekly quota before marking status **`approved`**.
   - `BOOKING_APPROVED` is logged to `audit_log` with the custodian's identity, reason, and timestamp.
   - An **in-app notification** is generated for the borrower.

---

### Step 5: Borrower In-App Notifications & My Bookings
**Goal:** Verify borrower decision visibility and notification alerts.

1. Switch persona back to **Alex Rivera (`user1@demo.com`)**.
2. Look at the top navigation bar:
   - The **Notification Bell** displays an unread counter badge.
   - Click the bell to open the dropdown and read the custodian's approval message and written justification.
3. Navigate to [`/bookings`](http://localhost:3001/bookings):
   - The booking card displays the green **`Approved`** badge along with the custodian's written justification.

---

### Step 6: Arrival Check-In (Within Booked Window Only)
**Goal:** Verify that check-in is restricted strictly to the active scheduled session window.

1. On [`/bookings`](http://localhost:3001/bookings), inspect the approved bookings:
   - Notice booking **`#bk-100`** (VR Simulation Space, scheduled for the **active current window right now**):
     - The green **"Check-In (Submit Arrival Condition Notes)"** button is visible and active.
   - Notice booking **`#bk-101`** (scheduled for tomorrow):
     - The Check-In button is **hidden**, displaying: `🕒 Check-in opens tomorrow at 10:00 AM`.
2. Click **"Check-In"** on `#bk-100`:
   - Enter baseline condition inspection notes (minimum 10 characters with live counter).
   - Check the physical verification items (cleanliness, safety interlocks, accessories).
   - Click **"Authorize Check-In"**.
3. Status transitions to **`checked_in`**, and `CHECKED_IN` is logged to `audit_log`.

---

### Step 7: Departure Return with Condition Rating & Late Turnaround Flag
**Goal:** Verify condition rating capture, departure inspection, and late return delay calculation.

1. On [`/bookings`](http://localhost:3001/bookings), find booking **`#bk-104`** (Autonomous Rover Chassis, `checked_in`, session scheduled to end 15 minutes ago).
2. Click **"Return Resource & Complete"**:
   - The modal automatically detects turnaround delay: `⚠️ Turnaround Delay Detected (+15m delay)`.
3. Select a **Condition Rating**:
   - Choose `Good` (Pristine, fully functional), `Minor Wear`, or `Damaged`.
4. Enter departure return notes ($\ge 10$ characters) and click **"Complete Return Inspection"**:
   - Status transitions to **`completed`**.
   - The booking card displays the rating badge and `Returned late (+15m delay)`.
   - Both `RETURNED` and `LATE_RETURN` are committed to `audit_log`.

---

### Step 8: Universal Incident Reporting & Custodian Resolution
**Goal:** Verify reporting across categories and custodian resolution without automatic penalties.

1. On any booking card, click **"Report Incident"**.
2. Select category: `damage`, `delay`, `safety`, or `conflict`.
3. Enter description ($\ge 10$ chars) and submit:
   - Notice the banner: *CampusShare Rule: Strict "No Automated Penalties" Policy.*
   - `INCIDENT_REPORTED` is written to `audit_log`.
4. Open the Incident Desk at [`/incidents`](http://localhost:3001/incidents).
5. Switch persona to **Prof. Elena Vance (`owner@demo.com`)**:
   - Click **"Resolve Incident &rarr;"** on the incident card.
   - Enter resolution findings ($\ge 10$ chars) and submit.
   - Status updates to **`resolved`**, and `INCIDENT_RESOLVED` is recorded in `audit_log`.

---

### Step 9: Confidential Booking Detail & Audit Timeline (`/bookings/[id]`)
**Goal:** Verify 403 privacy barriers and comprehensive visual timeline synthesis.

1. As **Alex Rivera (`user1@demo.com`)**, open [`/bookings/bk-100`](http://localhost:3001/bookings/bk-100) (or click **"View Timeline &rarr;"** from My Bookings):
   - Inspect the reservation overview, arrival inspection notes, and incident history.
   - Inspect the **Lifecycle Audit Timeline** stream on the right showing every event in chronological order: `BOOKING_REQUESTED` &rarr; `BOOKING_APPROVED` &rarr; `CHECKED_IN` &rarr; `RETURNED`.
2. In the top navigation, switch persona to **Jordan Lee (`user2@demo.com`)** (an unrelated student):
   - Observe the **403 Access Restricted** confidential barrier screen protecting the student's research purpose and condition logs.

---

### Step 10: Immutable Audit Compliance Trail (`/audit`)
**Goal:** Verify governance traceability across all platform events.

1. Navigate to [`/audit`](http://localhost:3001/audit).
2. Filter by action categories: `All Events`, `Bookings`, `Check-Ins`, `Returns`, `Incidents`.
3. Inspect the JSON payload, actor identity, and timestamp of every action.
4. Click **"Export JSON Audit Trail"** to download the complete audit trail.
