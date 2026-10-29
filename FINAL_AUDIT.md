# CampusShare — Final Independent QA Audit Report

**Audit Target:** Live Production Vercel Deployment — `https://hackathon-steel-eta.vercel.app`  
**Auditor:** Strict Independent QA Gate & Technical Lead  
**Audit Timestamp:** 2026-10-29T23:35:00+05:30  
**Repository:** `https://github.com/Sumaan0104/Hackathon.git`  
**Testing Methodology:** Live headless browser automation (Edge / Puppeteer Core), network response inspection, direct Supabase PostgreSQL queries, and code verification.

---

## 1. Evaluation Matrix (Parts A & B)

| Item | Requirement / Scenario | Verdict | Verified Evidence & Citations |
| :--- | :--- | :---: | :--- |
| **A1** | **Logged-Out Experience**<br>Live site loads, demo credentials visible, zero console errors. | **PASS** | HTTP 200 on `https://hackathon-steel-eta.vercel.app/login`. All 4 personas visible with credentials: `user1@demo.com`, `user2@demo.com`, `owner@demo.com`, `admin@demo.com` (`DemoPassword123!`). Browser console errors: 0. |
| **A2** | **Owner Creates Resource**<br>Owner lists asset with operating hours and safety requirements. | **PASS** | Logged in as `owner@demo.com`. Clicked navbar button `List Resource`. Submitted listing `"Quantum Pod 7716"` at `"Quantum Wing 401"`. Verified created in Supabase PostgreSQL (`res-1793296348509`) and recorded `RESOURCE_CREATED` in `audit_log` (`aud-1793296348509-623`). |
| **A3** | **Uncertified User Eligibility Gate**<br>User lacking required cert is blocked with clear missing cert feedback. | **PASS** | Logged in as `user2@demo.com` (Jordan Lee, uncertified). Clicked `Reserve Slot` on Photonics Lab (`res-1`). Exact on-screen message: `"Eligibility Blocked: Missing Prerequisites \| You're missing: Laser Safety Tier-2 Certification"`. Submit button disabled with label `"You're missing: Laser Safety Tier-2 Certification"`. Server action `requestBookingAction` strictly rejects (`lib/store.ts#L368-L384`). |
| **A4** | **Certified User Books Free Slot**<br>Eligible borrower books open slot, status set to `pending`. | **PASS** | Logged in as `user1@demo.com` (Alex Rivera, certified). Submitted booking for open equipment. Initial status set strictly to `pending`. Emits `BOOKING_REQUESTED` to `audit_log` (`lib/store.ts#L474`). |
| **A5** | **Clash Handling & Waitlist Offer**<br>Overlapping request is rejected with conflicting slot & waitlist option. | **PASS** | Attempting to book an overlapping window displays on-screen conflict: `"Conflict: Slot overlaps with an approved booking by [Name]"`. Submit button changes to `"Slot Taken (Join Waitlist Above)"`. Clicking `"Join Fair-Access Waitlist"` places user on waitlist queue and logs `WAITLIST_JOINED` (`lib/store.ts#L535`). |
| **A6** | **Fair Access: Weekly Cap (6.0h)**<br>Exceeding 6h weekly limit is blocked, showing exact rule & hours left. | **PASS** | Borrower Alex Rivera has 6.0h booked. Attempting 2.0h booking triggers on-screen rule error: `"Rule: Weekly cap of 6.0 hours per user. You currently have 6.0 hours booked this week (0.0 hours left). Requesting 2.0 hours exceeds your cap."` Submit button disabled (`components/BookingRequestModal.tsx#L270-L290`, `lib/store.ts#L386-L402`). |
| **A7** | **Owner Review Flow**<br>Approve / Reject / Waitlist with written reason $\ge 10$ chars. User sees reason & notif. | **PASS** | Route `/owner/requests` as `owner@demo.com`. Reviewing pending request `bk-102`. Reason $< 10$ characters disables submit button with live counter (`"2 / 10 min characters"`). Server action enforces $\ge 10$ chars (`lib/store.ts#L562-L565`). Approval logs `BOOKING_APPROVED` to `audit_log` and sends in-app notification to borrower (`lib/store.ts#L604-L633`). |
| **A8** | **Fair Waitlist LRU Priority**<br>Waitlist screen explains least-recently-used prioritization. | **PASS** | Clicked `Waitlist` on resource card. `components/WaitlistQueueModal.tsx` opens displaying exact policy banner: `"Rule: Waitlist ordered by least recent use. To guarantee equitable sharing across campus, researchers who have never used or least recently used this facility are given priority position in the queue."` Sorting handled by `CampusShareStore.getWaitlistByLeastRecentUse()` (`lib/store.ts#L899-L928`). |
| **A9** | **User Cancellation Flow**<br>User cancels with reason; hours freed and other party notified. | **FAIL** | **Not implemented.** Codebase search reveals no cancellation button in UI (`app/bookings/page.tsx`), no `cancelBookingAction` server action, no cancellation modal, no notification, and no `BOOKING_CANCELLED` audit entry. While `BookingStatus` defines `'cancelled'`, borrowers cannot self-cancel bookings. |
| **A10** | **Check-In & Return Records**<br>Window-guarded check-in, condition rating, late return flagged. | **PASS** | On `/bookings` as Alex Rivera: `#bk-100` (scheduled right now) shows green button `"Check-In (Submit Arrival Condition Notes)"`, opening modal requiring $\ge 10$ chars notes and inspection checklist (`status -> checked_in`, logs `CHECKED_IN`). `#bk-104` (`checked_in`) shows blue button `"Return Resource & Complete"`. Because scheduled end time was 15m ago, modal detects turnaround overrun, flags `is_late = true`, computes late minutes, transitions `status -> completed`, and logs both `RETURNED` and `LATE_RETURN` (`lib/store.ts#L785-L797`). |
| **A11** | **Incident Reporting & Resolution**<br>Report with category, owner resolution, strict zero automatic penalty. | **PASS** | Booking card displays `"Report Incident"`. Modal supports `damage`, `delay`, `safety`, `conflict`. Banner guarantees: *"CampusShare Rule: Strict 'No Automated Penalties' Policy."* Logs `INCIDENT_REPORTED`. On `/incidents`, custodian clicks `"Resolve Incident"`, enters written note ($\ge 10$ chars), and logs `INCIDENT_RESOLVED` (`lib/store.ts#L873-L897`). Zero automated fines, bans, or account strikes exist anywhere in code. |
| **A12** | **Full History & Timeline**<br>Booking detail page displays visual chronological timeline to authorized users. | **PASS** | `/bookings/bk-100` displays comprehensive chronological timeline on the right: `BOOKING_REQUESTED` &rarr; `BOOKING_APPROVED` &rarr; `CHECKED_IN` &rarr; `RETURNED` with timestamps, actor badges, and inspection notes. Gated on server to borrower and custodian (unauthorized student `user2@demo.com` receives 403 Access Restricted screen, `app/bookings/[id]/page.tsx#L85-L130`). |
| **A13** | **Audit Trail & JSON Export**<br>Immutable audit trail with export function. | **PARTIAL** | On `/audit`, all platform lifecycle events are rendered chronologically with actor, target, timestamp, and metadata. Button `"Export JSON Audit Trail"` downloads complete log (`app/audit/page.tsx#L74-L85`). Marked **PARTIAL** because `BOOKING_CANCELLED` is missing due to missing feature A9. |
| **B1** | **Data Storage & Serverless Persistence**<br>Zero state in memory/browser; persistence across devices and hard refresh. | **PARTIAL** | Remote Supabase PostgreSQL tables exist (`profiles`, `resources`, `bookings`, `incidents`, `audit_log`). However, on Vercel serverless, in-memory store is ephemeral. While hydration pulls from Supabase, in-app notifications exist only in server memory (`notifications: Map<string, InAppNotification>`), and local JSON cache (`.data/shared_db.json`) is discarded on serverless container recycling. |
| **B2** | **Role Security & Persona Switcher**<br>Plain user denied owner/admin actions. Role spoofing prevented. | **FAIL** | **Server action parameter spoofing vulnerability:** Server action helper `getProfileServer` (`lib/actions.ts#L21-L59`) accepts `profileIdOrEmail: string` from the client. If `profileIdOrEmail !== user.email`, it falls back to looking up the target profile from the store. A malicious client could pass `profileIdOrEmail: "owner@demo.com"` to invoke owner actions. Identity must be bound strictly to the verified Supabase Auth JWT cookie. |
| **B3** | **Concurrency: Double-Booking Prevention**<br>Can two requests for the exact same slot both get approved? | **FAIL** | **Distributed race condition risk:** Schedule clash validation occurs in application logic (`lib/store.ts#L571`) before writing approval. In a multi-instance serverless environment (Vercel), two concurrent approval requests executing simultaneously in separate lambdas can both pass application clash checks before either write finishes. Supabase schema lacks a PostgreSQL exclusion constraint (`EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&)`). |
| **B4** | **Secrets & Git Hygiene**<br>No service role key or secrets committed or leaked in bundles. | **PASS** | Git history inspected (`git log -p`). Zero private keys or service role secrets committed. `.env.local` untracked and excluded in `.gitignore`. Client bundle only exposes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon key). |
| **B5** | **Mobile Width Usability (390px)**<br>Core journey usable with no horizontal scrolling. | **PASS** | Puppeteer tested on viewport width 390px across `/`, `/login`, `/bookings`, `/incidents`, `/audit`. Metrics: `clientWidth: 390, scrollWidth: 390, hasHorizontalOverflow: false` across all routes. Navigation collapses to responsive drawer; zero horizontal scroll. |
| **B6** | **Notifications Coverage**<br>Notifications for approval, rejection, waitlist, cancel, overdue return. | **PARTIAL** | Notifications exist for approval, rejection, and waitlist (`lib/store.ts#L604-L630`). Notifications are **MISSING** for cancellation (feature not built) and **MISSING** for overdue returns (overdue returns flag delay and write audit log, but do not emit an in-app notification). |
| **B7** | **Demo Reset Tooling**<br>Clear labelling, authorization control, accidental wipe protection. | **PARTIAL** | Action is role-gated on server to `admin` and `manager` (`lib/actions.ts#L360`). Labelled `"Factory Reset Demo Fixtures"` in the persona dropdown. However, clicking the button triggers reset **immediately without a confirmation prompt or dialog**, risking accidental data wipe during live judging. |
| **B8** | **Repo Portability & Clean Documentation**<br>Shareable repo, run instructions, .env.example, no absolute user paths. | **FAIL** | `README.md` and `.env.example` exist. However, `AUDIT_REPORT.md` (created in prior turn) contains local machine paths (`file:///C:/Users/Suman%20Mansuri/...`), which fail on other machines and expose local filesystem usernames. |
| **B9** | **Claims vs Reality Audit**<br>Compare reports against reality; list false or overstated claims. | **FAIL** | 1. `TESTING.md#L5` links to GitHub rather than live URL `https://hackathon-steel-eta.vercel.app`.<br>2. `TESTING.md` references `localhost:3001` rather than production paths.<br>3. `AUDIT_REPORT.md` marked Core Journey 100% PASS despite cancellation missing from code.<br>4. Specification requires user cancellation, but codebase does not support it. |

---

## 2. MUST-FIX Blockers (Hackathon Submission Blockers)

1. **Implement Booking Cancellation Flow (Rule A9 & A13):**
   - **Problem:** Students cannot retract or cancel a booking once requested. This locks weekly quota hours until an owner manually rejects or the week expires.
   - **Remedy:** Add `cancelBookingAction(bookingId, cancellationReason)` in `lib/actions.ts`. Add a "Cancel Reservation" button on borrower cards in `app/bookings/page.tsx` and modal requiring $\ge 10$ character reason. Restore weekly quota hours and emit `BOOKING_CANCELLED` to `audit_log`.

2. **Hard-Bind Server Action Identity to Supabase Session Cookie (Rule B2):**
   - **Problem:** `getProfileServer(profileIdOrEmail)` accepts an unverified client parameter and falls back to looking up profiles by email if the cookie check fails.
   - **Remedy:** Disallow client-provided `profileIdOrEmail` overrides for privileged operations. Strictly extract the caller's identity from `supabase.auth.getUser()` session cookies. Return 401/403 if the session cookie is missing or does not match the required role.

3. **Database Concurrency Lock for Overlapping Slots (Rule B3):**
   - **Problem:** Two concurrent approval requests across serverless containers could simultaneously approve overlapping slots.
   - **Remedy:** Add PostgreSQL exclusion constraint or run approvals inside an atomic database function (`SELECT FOR UPDATE` or `EXCLUDE USING gist`) to guarantee serialization at the database layer.

4. **Purge Absolute Windows Machine Paths from Documentation (Rule B8):**
   - **Problem:** `AUDIT_REPORT.md` contains `file:///C:/Users/Suman%20Mansuri/...` paths that expose private usernames and break when viewed by judges.
   - **Remedy:** Replace all absolute URLs in `AUDIT_REPORT.md` with repository-relative paths (`lib/...`, `components/...`).

5. **Update TESTING.md with Live Vercel URL (Rule B9):**
   - **Problem:** Line 5 of `TESTING.md` points to GitHub instead of `https://hackathon-steel-eta.vercel.app`, and lists localhost ports.
   - **Remedy:** Update target links to the live production deployment.

---

## 3. NICE-TO-FIX Improvements

1. **Confirmation Dialog for Factory Reset (Rule B7):**
   - Add a `window.confirm("Are you sure you want to reset all demonstration data?")` or modal confirmation before invoking `resetDemoDataAction` from the Navbar.
2. **Dedicated Supabase `notifications` Table (Rule B1 & B6):**
   - Move in-app notifications from server memory map into a persistent `public.notifications` PostgreSQL table so notifications survive serverless container recycling.
3. **Overdue Return In-App Notification (Rule B6):**
   - When a borrower returns equipment past the scheduled window, emit an in-app notification alerting the user and facility custodian of the recorded turnaround delay.
4. **Supabase Realtime WebSockets:**
   - Integrate `supabase.channel('public:bookings').on(...)` so changes made by an owner on one device instantly reflect on a student's phone without requiring manual page refresh.

---

## 4. Final Verdict

Under the explicit governance gate criterion (**"GO only if A1-A13 and B1-B4 all PASS"**):

* Item **A9** (User cancellation flow) is **FAIL** (not built).
* Item **B2** (Server action actor parameter spoofing) is **FAIL** (untrusted client param fallback).
* Item **B3** (Serverless double-booking concurrency) is **FAIL** (no database exclusion constraint).

# **NO-GO**
