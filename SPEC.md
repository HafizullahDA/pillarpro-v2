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
Offline handling:
Attendance and Expense entry (including receipt photo capture) must queue locally and sync automatically on reconnect. Given field conditions, this is treated as core architecture.

---

# SECTION B — As-Built System Specification & Architecture Enhancements

This section records the live, production-grade architecture of PillarPro v2 as built, noting design evolutions, schema enhancements, and government tendering features implemented beyond the initial Section A blueprint.

---

## 1. Major Architectural Evolutions from Section A

### A. Vendor & Supplier Consolidation (Migration 013)
- **Problem**: Section A specified a `Vendors` module for purchases, while later iterations introduced `Suppliers`. Maintaining two separate accounts created duplicate entries, divided balances, and confusion.
- **Solution**: 
  - Retired the `Vendors` sidebar menu item and consolidated all vendor data into **Supplier Accounts** (`public.suppliers` and `public.supplier_transactions`).
  - Added material-level attributes (`quantity`, `rate`, and `unit` e.g. bags, tonnes, cum, kg, nos) to `public.supplier_transactions`.
  - Added automated triggers (`trg_ledger_supplier_transaction` and `trg_ledger_delete_supplier_transaction`) syncing supplier transactions directly to the master `public.ledger`.
  - Redirected mobile Floating Action Button (FAB) shortcuts to `/suppliers`.
  - Preserved historical `vendors`, `vendor_purchases`, and `vendor_payments` tables as immutable backups.

### B. Owner-Restricted Deletion Controls (Migrations 012 & 015)
- **Expenses Deletion (Migration 012)**: 
  - Restricts `DELETE` on `public.expenses` strictly to the `owner` role via Postgres RLS.
  - Automated trigger `trg_ledger_delete_expense` reverses associated polymorphic ledger entries upon deletion.
- **Supplier Deletion (Migration 015)**:
  - Split RLS policies so that `DELETE` on `public.suppliers` is strictly restricted to `get_user_role() = 'owner'`.
  - Cascades foreign key constraints on `supplier_transactions` so deleting a supplier purges associated transactions and triggers central ledger cleanups.
  - Provides a `SECURITY DEFINER` RPC `delete_supplier(UUID)` with strict role verification.

### C. Government RA Bill Engine Evolution (Migrations 008, 009, 010, 014, 016)
Section A described a basic "Receivables" table. The live system incorporates a full **Running Account (RA) Bills & Guarantee Management Engine** (`/ra-bills`):
1. **Dual Billing Modes (Migration 014)**:
   - **Standalone Mode**: Independent certified bills.
   - **Cumulative Mode (CPWD Form 26 / Standard MB Format)**: Tracks contract-to-date work certified from the Measurement Book. Automatically detects and references previous bills for that project, calculating incremental net-new work and Net Payable This Bill:
     $$\text{Net Payable This Bill} = (\text{Cumulative Net Certified To Date}) - (\text{Previous Cumulative Received To Date})$$
2. **Statutory Deductions & Treasury Payments Ledger (Migration 010)**:
   - Tranche-level ledger (`public.ra_bill_payments`) recording releases against bills.
   - Standard statutory withholding fields: TDS (IT u/s 194C), GST-TDS (Sec 51), and BOCW Labour Welfare Cess (1%).
   - Stored generated columns for `total_deductions` and `net_bank_amount`.
   - Real-time roll-up trigger `trg_sync_ra_bill_from_payments` updating `public.ra_bills`.
3. **Flexible Additional Deductions Engine (Migration 016)**:
   - Accommodates differing departmental withholding practices (NHPC, PMGSY, CPWD, Railways, PWD).
   - Introduces `public.bill_deductions` with `deduction_label` and `deduction_amount`.
   - Record Payment drawer features quick-add suggestion chips:
     `+ Royalty`, `+ GST on Royalty`, `+ TCS on Royalty`, `+ DMFT (Mineral Fund)`, `+ Withheld against Time Extension`, `+ Water / Electricity Charges`, `+ Testing & Quality Charges`.
   - Sums additional deductions into the Net Bank Cash calculation without affecting Gross Released or Outstanding balances.
4. **Security Deposits & Bank Guarantees (Migration 008)**:
   - Tracks Performance Bank Guarantees (PBG), Security Deposits (SD), Earnest Money Deposits (EMD), and Fixed Deposit Receipts (FDR).
   - Monitors issue dates, claim expiry dates, issuing banks, document attachments, and active alert statuses.

### D. AI Receipt Scanner Integration
- Endpoint `/api/scan-receipt` implemented using **Google Gemini Flash** multimodal model (`@google/genai`).
- Extracts vendor name, GSTIN, invoice date, total amount, and itemized line items from field photos.
- Directly links captured images to Supabase Storage and pre-fills expense entry drawers.

### E. Accounting Period Locking & Month Close (Migration 003, 007)
- Dedicated `/admin/periods` interface allowing Owners to close accounting months project-wise.
- Database trigger `guard_period_supplier_tx()` blocks non-Owner writes or deletions on closed periods.

### F. User Management & Onboarding (`/admin/users`)
- New users self-registering via Supabase Auth enter a `pending` status.
- Owners review pending registrations, activate accounts, designate roles (`owner`, `managing_partner`, `site_supervisor`), and assign project scopes via `project_members`.

---

## 2. Complete Database Migration Registry

| Migration | File Name | Key Schema Additions |
| :--- | :--- | :--- |
| **001** | `001_initial_schema.sql` | Core schema: `projects`, `project_members`, `workers`, `attendance`, `expenses`, `vendors`, `vendor_purchases`, `vendor_payments`, `client_bills`, `client_payments`, `partners`, `partner_transactions`, `ledger`. |
| **002** | `002_rls_policies.sql` | Database-level Row Level Security policies across all primary tables. |
| **003** | `003_phase2_additions.sql` | `accounting_periods` table, period-closure check functions, and soft-delete helpers. |
| **004** | `004_fix_user_profiles_roles_rls.sql` | `user_profiles`, role synchronization triggers, and `get_user_role()` RPC. |
| **005** | `005_grant_authenticated_table_permissions.sql` | Explicit SQL grants on tables and sequences for the Supabase `authenticated` role. |
| **006** | `006_add_email_to_user_profiles.sql` | Added `email` column to `user_profiles` to support Admin user directory. |
| **007** | `007_supplier_account_schema.sql` | `suppliers`, `supplier_transactions`, dynamic `supplier_summary` view, and period guard triggers. |
| **008** | `008_ra_bill_tracker_schema.sql` | `ra_bills`, `security_deposits`, retention percentage, and measurement sheet storage attachments. |
| **009** | `009_fix_ra_bill_outstanding_formula.sql` | Stored generated columns for `net_payable_amount` and `outstanding_balance` on `ra_bills`. |
| **010** | `010_statutory_deductions_and_payments_ledger.sql` | `ra_bill_payments` ledger table, statutory deductions roll-up trigger, and `net_bank_received` tracking. |
| **011** | `011_project_archive_soft_delete.sql` | Added `archived` boolean flag, archive RPC functions, and filtered directory queries. |
| **012** | `012_owner_expense_delete_and_ledger_sync.sql` | Restricted expense deletion to Owner in RLS; added `trg_ledger_delete_expense` cleanup trigger. |
| **013** | `013_migrate_vendors_to_suppliers.sql` | Migrated Vendors into Suppliers; added quantity/rate/unit; added automated ledger sync triggers. |
| **014** | `014_ra_bill_cumulative_mode.sql` | CPWD Form 26 Cumulative Billing Mode, previous bill detection, and incremental certified amounts. |
| **015** | `015_owner_supplier_delete.sql` | Owner-restricted supplier deletion with cascading FK constraint on transactions and `delete_supplier` RPC. |
| **016** | `016_bill_deductions.sql` | Flexible `bill_deductions` line-items table (Royalty, GST on Royalty, TCS, DMFT, withholds). |

---

## 3. Roadmap: Upcoming Senior Government Contractor Modules

1. **Hindrance Register & Automated EOT Claim Engine (Clause 5 / Form 14)**:
   - Comprehensive log of client-caused project hindrances (site handover delay, drawing delay, utility shifting, monsoon/weather, delayed running payments).
   - Delay categorization (overlapping vs. concurrent) to protect against Liquidated Damages (LD) and milestone penalties.
   - Auto-generation of formal CPWD Extension of Time (EOT) claim packages.
2. **Retention Money & Defect Liability Period (DLP) Pipeline**:
   - Tracking 5% cash retention deductions across projects.
   - Project completion handover and DLP milestone countdowns (12, 24, or 36 months).
   - Automated notifications for Bank Guarantee / FDR maturity and release applications.
3. **BOQ Deviations & Extra Items Register (Clause 12 Variation Sanctions)**:
   - Tracking deviations beyond standard permissible limits (+/- 25% or 30%).
   - Approval tracking for non-BOQ extra items, substituted items, and revised rate analyses prior to billing.

