SECTION A — Master Specs
App overview

PillarPro is a mobile-first construction ERP for a civil construction and manpower supply firm running multiple simultaneous government-contracted sites. It replaces spreadsheet tracking with a single ledger-first system where every financial and attendance event ties back to a specific project. Primary users: an owner, a co-managing partner, and site supervisors, all working mostly from phones on-site.

Tech stack
Frontend: mobile-first responsive web app (Next.js recommended for Vercel deployment)
Backend/DB: Supabase (Postgres + Auth + Row Level Security + Storage)
Hosting: Vercel
Auth: Supabase Auth (email/password, or phone OTP if useful given field-based users with variable email access)
Core design principle

One centralized ledger feeds all derived views. Every expense, receipt, salary entry, attendance record, and partner movement writes to a single source-of-truth ledger table, tagged by project and category. Dashboard and module views are all read-projections of that ledger, not separately maintained totals.

User roles
Role	Scope	Permissions
Owner	All projects	Full read/write, including project setup, closing months, deleting entries
Managing Partner	All projects (or assignable subset)	Read/write on Attendance, Expenses, Vendors, Receivables. Cannot edit core project fields (contract value, client, scope) or delete closed-month entries
Site Supervisor	Assigned project(s) only	Add Attendance and Expense entries for their project(s) only. Read-only on their own project's summary. No access to other projects, no access to Partners module, cannot edit/delete entries after submission window closes (e.g. same day)
Modules (confirmed from the live app — build these exactly, then add the fixes listed under each)
Sign up / Sign in — Supabase Auth, with role assigned at account creation (or by Owner invite — see Auth section below).
Dashboard — unified ledger summary with: Total Expense, Total Received, Outstanding, Vendor Dues; an Outstanding Alerts panel ("Projects with receivables still pending collection"); a By Project table (Expense, Received, Receivables, Net movement per project); a By Category breakdown. See "Dashboard requirements" below for fixes.
Projects — create/view project records with: Project name, Agency name, Advertised cost, Awarded amount, Start date. Project list shows recent records loaded from Supabase.
Fix: add a worker/employee master (see Attendance below), an End date / status field (active/completed), and a way to attach the award letter/work order document.
Vendors — three linked sub-flows, all confirmed working: (a) Create vendor — Project, Vendor name, Contact person, Phone; (b) Add purchase — Project, Vendor, Material, Quantity, Rate, Date, "Saving a purchase will also create an expense record in the central transactions table"; (c) Add payment — Project, Vendor, Amount paid, Mode, "Saving a payment will also create a payment record in the central transactions table." Vendor list shows Project/Contact/Phone.
Fix: add a unit field (bags/kg/tonnes/nos) alongside Quantity; show a live Quantity × Rate subtotal before save; add a running "Due" column per vendor on the vendor list instead of requiring manual netting; add duplicate-vendor detection (two vendor records under the same project with similar names should be flagged).
Attendance — "Mark one site day at a time" per Project + Month, with a horizontal day-picker (01 SAT, 02 SUN, etc.), and summary tiles: Workers, On Site, Unmarked, Day Cost. Currently shows "No workers found for this project yet."
Fix: this is the single biggest functional gap — there is no visible way to add a worker. Build a Worker/Employee master module (name, trade/role, daily wage rate, assigned project(s)) that Attendance reads from, since "Day Cost" cannot calculate without a wage rate on file.
Receivables — Project summary dashboard table (Agency, Advertised cost, Awarded amount, Total billed, Amount received, Outstanding); Add bill (Project, Bill number, Bill type, Bill date, Gross amount, Deductions); Add payment (Project, Bill, Amount received, Date, Mode, Reference/cheque no.), explicitly reduces outstanding and writes to the master ledger. Bills table and Payment table list recent entries.
Fix: constrain "Bill type" to a fixed set (RA Bill / Final Bill / Advance / Mobilization Bill) instead of an unlabeled dropdown, to keep entries consistent across two people billing; add aging bands to Outstanding; add a way to attach a photo/PDF of the bill or Measurement Book (MB) page; add mobilization/secured-advance tracking that isn't tied to a specific RA bill.
Partners — Add partner (Project, Partner name); Record partner transaction (Project, Partner, Transaction type, Amount, Date, Mode) — "Paid by partner increases balance. Received by partner decreases balance." Running balance shown per partner ("Positive means partner has paid in more. Negative means partner has received more"), plus a Partner transactions list.
Fix: Partners are currently scoped per-project only — add an "Unassigned / Firm-level" option for partner capital or draws that aren't tied to a single site; add an opening balance field for migrating existing partner balances from the current spreadsheet system; add a purpose/note field distinguishing capital contribution vs. profit draw vs. reimbursement, since that distinction matters for the firm's own accounting later.
Expenses (Misc) — "Track fuel, equipment, tendering, and site expenses with automatic ledger entries." Add miscellaneous record: Project, Category, Amount, Date, Description. Records table lists entries, each pushed into the central transactions table.
*Fix: add Mode/Reference fields here too (Receivables already has them — Misc Expenses currently doesn't, which breaks reconciliation consistency); add a receipt/photo attachment field (this is where the receipt scanner plugs in — see below); confirm Category options here use the exact same taxonomy as Vendor purchase categories, since Vendors, Misc, and (eventually) Attendance/salary all write to the same central transactions table and a mismatched taxonomy will corrupt the Dashboard's "By category" breakdown.
Dashboard requirements (fixing gaps found in the current version)
Project filter + "All Projects" toggle on all summary blocks
Net Position block: Total Received − Total Expense, and Outstanding − Vendor Dues, visually distinct from the four base totals
Date range selector: This Month / This Quarter / Custom / All Time
Aging bands on Outstanding and Vendor Dues (0–30 / 31–60 / 60+ days)
Floating quick-add button for Attendance and Expense entry, reachable from any screen
Trend chart: expense vs. received, trailing 6 months
"Projects at a Glance" strip: compact per-project status (red/amber/green by outstanding vs. dues)
Role-aware view: Owner/Partner see toggle for "My Sites" vs. "All Sites"; Supervisors see only their assigned project(s), no toggle
Auth requirements (sign up / sign in)
Sign up creates a Supabase Auth user; role and project assignment are NOT self-selected by the signer-up. New accounts default to "pending" with no permissions until the Owner approves them and assigns a role + project scope from an Admin/Users screen.
Sign in: standard email/password (add phone OTP as a stretch goal if email access is unreliable in the field).
Session should persist on mobile (avoid forcing re-login on spotty connections).
Password reset flow via Supabase Auth's built-in email reset.
Receipt scanner (Expenses module)
"Scan Receipt" entry point opens the camera directly from Expenses or the dashboard quick-add.
Captured image is sent for OCR/vision extraction (vendor, amount, date, GST number, line items if visible) — use a vision-capable LLM call (e.g. Anthropic API with image input, structured JSON output) rather than a traditional OCR library, for better handling of handwritten or low-quality receipts.
Extracted fields pre-fill the normal expense entry form — never auto-save without user confirmation.
Auto-match extracted vendor name against existing Vendor records; link instead of duplicating.
Auto-categorize against existing expense categories (labor, material, equipment, transport, fuel, admin, etc.).
Store the original receipt image in Supabase Storage, permanently linked to the ledger entry, for audit trail.
Flag possible duplicates (similar vendor + amount + date already logged) before save.
Queue capture offline; run OCR/categorization once connectivity returns.
Role-based access control (implementation)
roles table: user_id, role, project_id (nullable — null means all projects, used for Owner/Partner).
project_members table: links Supervisors to their specific assigned project(s).
Supabase RLS policies enforce all of the above at the database level, not just hidden in the UI:
Supervisors: INSERT only into attendance and expenses for their linked project(s); SELECT scoped to same.
Managing Partner: broad SELECT/INSERT/UPDATE, blocked from UPDATE/DELETE on projects core fields and from writes where closed_at IS NOT NULL on the relevant ledger period.
Owner: unrestricted.
Add closed_at timestamp on ledger periods; all non-Owner writes are blocked once a period is closed, enforcing month-close integrity.
Version control (GitHub)

You need a repo before Phase 1, not after. Claude Code and Codex both work directly with a local git repo, and Vercel deploys straight from GitHub, so this is the backbone that ties the whole rebuild together.

Setup, before Phase 1:

Create a new GitHub repo (e.g. pillarpro-v2) — private, since this holds real financial data structure and eventually real project data.
Clone it locally, or open it directly in Claude Code/Codex if you're working from the same machine.
Put the Master Spec (Section A of this document) into the repo root as SPEC.md on day one. This is what makes it "context" for every phase instead of something you re-paste each time — Claude Code and Codex will read files in the repo automatically.
Add a .env.local (gitignored) for your Supabase URL/keys — never commit these. Add .gitignore for node_modules, .env*, .next.
Make an initial commit with just the empty scaffold + SPEC.md before running Phase 1.

Branching per phase (recommended over committing straight to main):

Create one branch per phase: phase-1-auth-schema, phase-2-core-modules, phase-3-dashboard, etc.
After each phase's prompt runs and you've tested it, merge that branch into main and only then start the next phase's branch. This gives you a clean rollback point if a later phase's AI-generated changes break something earlier — you can always go back to the last working main.
Commit after every meaningful chunk within a phase, not just once at the end — small commits make it far easier to spot exactly which change broke something if a phase goes wrong.

Keep migrations in the repo, not just in the Supabase dashboard:

Store your Postgres schema and RLS policy changes as SQL migration files inside the repo (e.g. supabase/migrations/), not only applied by hand through the Supabase web UI. This way the schema history lives in git alongside the code that depends on it, and Phase 1's exact RLS policies are reviewable and re-runnable rather than only existing as a one-time action you took in a dashboard.

Deployment:

Connect the GitHub repo to Vercel once, so every merge to main auto-deploys. Use a separate Supabase project (or at least separate .env values) for a staging/preview environment vs. production, so you're not testing Phase 4's receipt scanner against your real project ledger data.

Working with your brother's changes later:

Once the app is live and your brother is also making entries (not code changes — he's a user, not a developer, based on what you've described), this is separate from the GitHub workflow above. But if you ever want him or a hired developer to also push code changes, the same branch-per-change, review-before-merge pattern applies — never let anyone push straight to main.
Attendance and Expense entry (including receipt photo capture) must queue locally and sync automatically on reconnect. Given field conditions, this is not optional — treat it as core, not a stretch goal.
Offline handling
Attendance and Expense entry (including receipt photo capture) must queue locally and sync automatically on reconnect. Given field conditions, this is not optional — treat it as core, not a stretch goal.
