Project: CampusShare, a trusted platform for sharing underused labs, equipment and spaces at one college (fictional data only).
Stack: Next.js App Router, TypeScript, Tailwind, Supabase (auth + Postgres), deployed on Vercel. Mobile friendly.
Roles: user, owner, manager, admin.
Journey: owner lists resource -> user discovers it and checks eligibility -> user requests booking -> system checks requirements and clashes -> owner reviews -> approve/reject/waitlist with written reason -> check-in with condition notes -> return with condition notes -> delay/damage/incident reports -> both parties see full history.
Rules: every important action writes to audit_log. Every approve/reject/waitlist needs a written reason shown to the user. Weekly hours cap per user (default 6h). Waitlist ordered by least recent use. Owners make final decisions. No automated penalties. All role checks happen on the server. Never commit secrets.
