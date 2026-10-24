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

# SECTION B — As-Built System Specification & Production Architecture

This section records the live, production-grade architecture of PillarPro v2 as built, documenting the complete evolution from the initial Section A blueprint into a comprehensive, multi-tenant Civil Infrastructure Operating System adhering to CPWD Works Manual 2024, State PWD accounts codes, IS 1200 measurement standards, and Indian government treasury protocols.

---

## 1. Major Architectural Evolutions & Four Pillars Engine

### A. Multi-Tenant Organizational Workspaces (Migrations 019, 020, 024, 025, 068)
- **Problem**: Section A assumed a single-firm deployment. Modern civil EPC contractors frequently manage multiple corporate entities, joint ventures (JVs), and package-specific SPVs.
- **Solution**:
  - Introduced `public.organizations` with unique invite codes (e.g. `APEX26`), custom billing configurations, and subscription tiers (`starter`, `growth`, `enterprise`).
  - Scoped all operational, financial, and contractual tables (`projects`, `contracts`, `boq_items`, `measurement_books`, `ra_bills`, `suppliers`, `workers`, `ledger`) by `organization_id`.
  - Automated self-serve contractor firm creation via `public.onboard_contractor(org_name, admin_name)`.
  - Migration 068 & 078 enforce strict tenant-isolation Row Level Security (RLS) policies preventing cross-tenant leakage.

### B. 10-Tier Construction RBAC Hierarchy & Fail-Closed Security (Migrations 017, 062, 075, 078)
- **Role Hierarchy**:
  1. `owner`: Full executive and administrative control, month closures, contract amendments, organizational settings, and deletion authorization.
  2. `admin`: Organizational administration, user management, and platform configurations.
  3. `project_manager`: Full operational and physical management across assigned or all project packages.
  4. `billing_engineer`: Preparation of RA bills, CPWA Form 26 abstracts, measurement reconciliation, and certificate submission.
  5. `site_engineer`: Mobile field measurements (L×B×D), chainage logging, Level Book readings, and GPS photo evidence.
  6. `site_supervisor`: Daily worker muster rolls, attendance tracking, and machinery diesel logs.
  7. `store_manager`: Cement, rebar, fuel, and materials inventory, gate passes, and wastage logging.
  8. `data_entry`: Operational data logging with restricted modification permissions.
  9. `viewer`: Strictly read-only access for auditors, external consultants, and client observers.
- **Fail-Closed Security Guarantee (Migration 078)**:
  - Hardened `public.get_user_role()`: If a user has no active role assigned in `public.roles`, it only resolves to `owner` if the user is explicitly recorded as the `created_by` / `owner_id` of the organization. Otherwise, it **fails closed to `'viewer'`** (read-only).
  - Multi-tenant role resolution is strictly scoped by `organization_id`, preventing role leakage across firms.
  - Comprehensive unit test verification in `lib/calculations/__tests__/rbac_and_audit.test.ts`.

---

### C. Pillar 01 — Contract & Sanctioned BOQ Master Engine (Migrations 037, 051, 052)
- **Contract Agreement Vault (`public.contracts`)**:
  - Stores Agreement No., Award Value, Time for Completion, Defect Liability Period (DLP), Mobilization Advance terms, and Security Deposit percentages.
  - Clause 10CA & 10CC price escalation indices tracking (cement, steel, bitumen, labour, fuel).
- **BOQ Master (`public.boq_items`, `public.boq_revisions`)**:
  - Full support for Schedule of Rates (SOR) items, non-scheduled (NS) items, item rate ceilings, and sub-package breakdown.
  - **Unbalanced Bid Protection**: Automated algorithmic scanner detecting front-loaded rates, zero-rate items, and quantity variation risks.
  - Real-time tracking of tendered vs executed quantities with threshold warnings when approaching statutory variation ceilings (+/- 10% or +/- 25%).

---

### D. Pillar 02 — Digital e-MB, Chainage Measurements, TMT BBS & Level Books (Migrations 053, 054, 063, 076, 078)
- **Electronic Measurement Book (`public.measurement_books`, `public.measurement_entries`)**:
  - Replaces physical Measurement Books with an immutable digital e-MB conforming to IS 1200 Standard Method of Measurement.
  - Dynamic L×B×D calculation sheets with multi-row arithmetic and positive/negative deduction entries (e.g., deducting recesses, openings, and voids).
- **TMT Bar Bending Schedule (BBS) Engine (Migration 076)**:
  - Integrated rebar detailing for standard diameters (8mm, 10mm, 12mm, 16mm, 20mm, 25mm, 28mm, 32mm).
  - Automatically calculates cutting length, number of bars, total linear meters, and unit weight ($d^2 / 162$) with automatic Metric Ton (MT) conversion.
- **Level Book Integration**:
  - Benchmark Reduced Levels (RL), Back Sight (BS), Intermediate Sight (IS), Fore Sight (FS), Height of Instrument (HI), and collimation error verification.
- **Automated Variation Detection**:
  - Prevents Junior Engineer (JE) arithmetic rejections by auto-checking that executed quantities remain within permissible tender deviations.
- **Cryptographic Immutability Lock (Migration 062, 078)**:
  - Transitioning an e-MB entry to `status = 'CERTIFIED'` requires non-empty `page_number` and `entry_number`.
  - Once an entry is linked to `billed_in_ra_bill_id`, database triggers block any updates to `nos`, `length`, `breadth`, `depth`, `calculated_quantity`, `boq_item_id`, and `status`, and **completely block `DELETE` operations** on billed rows.

---

### E. Pillar 03 — Running Account (RA) Bills & Form 26 Statutory Engine (Migrations 008, 010, 014, 016, 038, 077)
- **Dual Billing Modes**:
  - **Standalone Mode**: Independent certified interim invoices.
  - **Cumulative Mode (CPWD Form 26)**: Contract-to-date work certified from e-MB sheets with auto-detection of prior certified bills, calculating incremental work executed since last bill.
- **Statutory Deductions & Recoveries Breakdown (Migration 077)**:
  1. *Security Deposit / Retention Money*: 5% or 10% deducted from gross bill value.
  2. *Income Tax TDS*: Section 194C (1% for individuals/HUF, 2% for companies/partnerships).
  3. *GST-TDS*: 2% total (1% CGST + 1% SGST) deducted under Section 51 of CGST Act.
  4. *BOCW Labour Welfare Cess*: 1% statutory deduction under Building and Other Construction Workers Act 1996.
  5. *Mobilization Advance Principal Recovery*: Percentage-based deduction per CPWD Form 35-A / Agreement Clause 10B.
  6. *Mining Royalty Deductions*: Minor minerals extraction charges (sand, stone, aggregates) based on departmental mining challans.
  7. *Departmental Penalties & Withhelds*: Liquidated damages, interim time-extension penalties, testing charges, electricity/water recoveries (`public.bill_deductions`).
- **Tally Prime & ERP Double-Entry Journal Export**:
  - 1-click XML and CSV double-entry journal vouchers formatted for direct import into **Tally Prime 4.x**, **Tally ERP 9**, **Busy**, and **SAP B1**.
  - Accurately balances Gross Client Receivable (Dr) against statutory liability ledgers and net revenue accrual (Cr).

---

### F. Pillar 04 — Site Operations, Fleet Diesel & ContractIQ AI Legal Defense (Migrations 030, 031, 033, 040, 055, 056, 057, 058, 059, 060, 061)
- **Daily Progress Reports (DPR - Migration 031)**:
  - Logs weather conditions, labor gang headcounts, executed activities, and site photographs.
- **Machinery & Diesel Logs (Migration 030)**:
  - Heavy equipment logs (Excavators, Graders, Rollers, Dumpers, Pavers), hour-meter readings, and fuel consumption analytics.
- **Store Inventory & Materials Khata (Migration 033, 034)**:
  - Stock register for cement bags, structural steel, aggregates, and fuel. Automatic wastage threshold alerts.
- **Hindrance Register & Automated Extension of Time (EOT) Claim Engine (Migrations 040, 055, 059)**:
  - Systematic logging of client-caused project hindrances (delayed site handover, drawing delays, utility shifting, forest clearance, unseasonal rains, delayed running payments).
  - Distinguishes concurrent from non-concurrent delays to defeat Liquidated Damages (LD) claims.
  - Auto-compiles formal CPWD Form 14 Extension of Time (EOT) claim packages.
- **ContractIQ AI Legal & Clause Defense Engine (Migrations 058, 061)**:
  - Powered by **Google Gemini Flash** via `@google/genai`.
  - Analyzes contract clauses against site events in English and Hindi, issuing timely statutory notice drafts (e.g. CPWD Clause 5, Clause 7, Clause 10CC, Clause 12).
  - Assembles evidence binders for Dispute Resolution Boards (DRB) and arbitration proceedings.

---

### G. Automated WhatsApp Cloud API & Alert Dispatch Engine (Migrations 071, 072, 073, 074)
- Automated event scanners and cron dispatchers (`/api/cron/daily-alerts`, `/api/cron/evening-alerts`):
  1. *Morning Operational Briefing*: Pending measurements, day work targets, machinery mobilization.
  2. *Evening Labor & Muster Alert*: Site worker attendance count and daily labor wage accrual.
  3. *Bank Guarantee Expiry Warnings*: Multi-stage alerts at 30, 15, and 7 days prior to PBG/FDR maturity.
  4. *RA Bill Payment Escalation*: Alerts MDs when running account bills remain uncertified beyond standard statutory windows (CPWD Clause 7).

---

## 2. Complete Database Migration Registry (001 – 078)

| Migration | File Name | Core Architectural Scope |
| :--- | :--- | :--- |
| **001** | `001_initial_schema.sql` | Core schema: `projects`, `workers`, `attendance`, `expenses`, `ledger`, `partners`. |
| **002** | `002_rls_policies.sql` | Base Row Level Security policies across primary tables. |
| **003** | `003_phase2_additions.sql` | `accounting_periods` table and month-closure check functions. |
| **004** | `004_fix_user_profiles_roles_rls.sql` | `user_profiles`, role synchronization triggers, and `get_user_role()`. |
| **005** | `005_grant_authenticated_table_permissions.sql` | Table and sequence grants for Supabase `authenticated` role. |
| **006** | `006_add_email_to_user_profiles.sql` | Added `email` column to `user_profiles` for user admin management. |
| **007** | `007_supplier_account_schema.sql` | `suppliers`, `supplier_transactions`, and dynamic `supplier_summary` view. |
| **008** | `008_ra_bill_tracker_schema.sql` | `ra_bills`, `security_deposits`, and retention percentage tracking. |
| **009** | `009_fix_ra_bill_outstanding_formula.sql` | Generated column formulas for net payable and outstanding balances. |
| **010** | `010_statutory_deductions_and_payments_ledger.sql` | `ra_bill_payments` ledger table with statutory deduction roll-up triggers. |
| **011** | `011_project_archive_soft_delete.sql` | Soft deletion and project archive status flags. |
| **012** | `012_owner_expense_delete_and_ledger_sync.sql` | Owner-restricted expense deletion with automated ledger rollback triggers. |
| **013** | `013_migrate_vendors_to_suppliers.sql` | Consolidated Vendors into Suppliers; added quantity/rate/unit fields. |
| **014** | `014_ra_bill_cumulative_mode.sql` | CPWD Form 26 Cumulative Billing Mode with prior certified bill detection. |
| **015** | `015_owner_supplier_delete.sql` | Owner-restricted supplier deletion with cascading transaction integrity. |
| **016** | `016_bill_deductions.sql` | Departmental `bill_deductions` items (Royalty, GST on Royalty, TCS, DMFT). |
| **017** | `017_expand_user_roles.sql` | Expanded user role enum to support modern civil construction hierarchy. |
| **018** | `018_attendance_and_workers_rls.sql` | Hardened RLS policies for worker directories and daily muster rolls. |
| **019** | `019_organizations_schema.sql` | Multi-tenant organizational workspaces (`organizations` table and scoping). |
| **020** | `020_demo_organization_and_rls_isolation.sql` | Tenant-scoped RLS policies isolating firm data. |
| **021** | `021_partner_capital_and_project_shares.sql` | Partner capital infusions, drawings, and project profit-sharing shares. |
| **022** | `022_wage_tracking_ledger.sql` | Worker wage disbursements, advance registers, and payment history. |
| **023** | `023_remove_demo_organization.sql` | Cleaned up initial static demo tenants. |
| **024** | `024_self_serve_onboarding.sql` | Automated self-serve contractor organization creation (`onboard_contractor`). |
| **025** | `025_team_management_and_org_scoping.sql` | Firm invite codes, team invitations, and role-based staff onboarding. |
| **026** | `026_workers_organization_id_default.sql` | Enforced default `organization_id` assignment on worker creations. |
| **027** | `027_delete_worker.sql` | Safe worker deletion function with cascading attendance checks. |
| **028** | `028_suppliers_organization_id_default.sql` | Enforced default `organization_id` on supplier creation. |
| **029** | `029_remove_team_member.sql` | Secure team member offboarding RPC with role-revocation checks. |
| **030** | `030_machinery_and_diesel.sql` | Heavy plant & machinery registers, equipment logs, and diesel fuel tracking. |
| **031** | `031_daily_progress_reports.sql` | DPR master tables, weather tracking, gang counts, and site photo evidence. |
| **032** | `032_fix_security_definer_view.sql` | Fixed postgres view security invoker attributes across summary projections. |
| **033** | `033_store_inventory.sql` | Store inventory, stock receipts, material issuances, and warehouse balances. |
| **034** | `034_org_branding_and_inventory_wastage.sql` | Custom firm logos, letterhead branding, and material wastage logging. |
| **035** | `035_projects_organization_id_default.sql` | Automated tenant assignment on project creation. |
| **036** | `036_add_carriage_to_supplier_transactions.sql` | Added freight, carriage, and handling charges to supplier bills. |
| **037** | `037_boq_and_work_done_tracking.sql` | Initial BOQ line item structure and physical progress measurement tracking. |
| **038** | `038_cpwa_ra_bill_enhancements.sql` | Full CPWA Form 26 print layouts and statutory deduction headers. |
| **039** | `039_fix_onboarding_and_auto_activate.sql` | Auto-activation pipeline for primary contractor account owners. |
| **040** | `040_hindrance_register_and_eot_engine.sql` | Hindrance register schema, delay days computation, and EOT request tracking. |
| **041** | `041_subscription_lifecycle_and_entitlements.sql` | Subscription tier enforcement, project limits, and feature flags. |
| **042** | `042_attendance_overtime.sql` | Overtime hours tracking and proportional wage calculation. |
| **043** | `043_fix_receivables_bills_rls.sql` | Fixed RLS edge cases in receivables and billing views. |
| **044** | `044_partners_organization_id_default_and_rls.sql` | Scoped partner equity ledgers to active organization. |
| **045** | `045_org_profile_include_subscription_fields.sql` | Extended organization profiles with active subscription metadata. |
| **046** | `046_rich_sample_highway_project.sql` | Seed generator for demonstration highway EPC packages. |
| **047** | `047_visitor_telemetry_and_platform_admins.sql` | Landing page telemetry tracking and platform admin directories. |
| **048** | `048_fix_hindrances_and_eot_rls.sql` | Fixed RLS policy grants on hindrance register entries. |
| **049** | `049_fix_join_organization_role_cast.sql` | Fixed enum casting when joining organizations with user profiles. |
| **050** | `050_additional_security_deposit_enum.sql` | Added Performance Guarantee (PG) and Additional Security Deposit (ASD) enums. |
| **051** | `051_contract_master_schema.sql` | Comprehensive `contracts` master table with tender values and DLP dates. |
| **052** | `052_boq_master_and_revisions_schema.sql` | Sanctioned BOQ items, SOR codes, and formal revision audit history. |
| **053** | `053_measurement_module_schema.sql` | `measurement_books`, `measurement_entries`, and IS 1200 measurement items. |
| **054** | `054_measurement_ra_bill_integration.sql` | Linkage bridging certified e-MB measurement entries into RA bills. |
| **055** | `055_contract_events_and_hindrance_register.sql` | Contractual milestone events, hindrances, and concurrent delay classification. |
| **056** | `056_evidence_vault_and_completeness.sql` | Geo-tagged site evidence vault and documentary completeness scoring. |
| **057** | `057_correspondence_and_notice_tracking.sql` | Formal contractual letters, delay notices, and statutory time-bar tracking. |
| **058** | `058_contract_clause_management.sql` | Contract clause library (CPWD, FIDIC, MORTH, State PWD GCC/SCC). |
| **059** | `059_extension_of_time_module.sql` | Formal Extension of Time (EOT) claim package generator per CPWD Form 14. |
| **060** | `060_contract_variations_module.sql` | Clause 12 variation sanction tracking for extra, substituted, and deviated items. |
| **061** | `061_contract_claims_module.sql` | Formal dispute claims, price escalation claims, and arbitration binders. |
| **062** | `062_rbac_and_immutable_audit_trail.sql` | Construction RBAC permissions matrix and cryptographic measurement locks. |
| **063** | `063_measurement_rls_and_integrity_locks.sql` | Database triggers enforcing immutability on certified and billed e-MBs. |
| **064** | `064_fix_sample_project_seeding_and_security_deposit_rls.sql` | Hardened sample data seeders and security deposit policies. |
| **065** | `065_exclusive_visitor_telemetry_and_stay_duration.sql` | Advanced visitor engagement analytics and duration telemetry. |
| **066** | `066_fix_auth_user_cascades_and_deletion.sql` | Clean cascading deletion when terminating test or decommissioned users. |
| **067** | `067_fix_sample_project_seeding_and_onboarding.sql` | Enhanced automated onboarding pipeline with complete highway BOQ seeds. |
| **068** | `068_fix_tenant_isolation_and_rls_leakage.sql` | Strict tenant-scoping patch across all enterprise RPCs and background views. |
| **069** | `069_fix_financial_accuracy_and_gap_closures.sql` | Arithmetic precision fixes for retention calculations and cumulative offsets. |
| **070** | `070_record_level_activity_audit_logs.sql` | Enterprise `activity_audit_logs` tracking user IP, agents, and entity state diffs. |
| **071** | `071_alert_dispatch_logs_and_preferences.sql` | WhatsApp and system alert logging, retry queue, and delivery receipts. |
| **072** | `072_phase2_cashflow_and_vendor_alerts.sql` | Background cash flow scanners and vendor payment due dispatchers. |
| **073** | `073_phase3_operations_and_fleet_alerts.sql` | Automated dispatch for machinery diesel usage and daily site muster rolls. |
| **074** | `074_phase4_alert_preferences_and_control_center.sql` | Contractor Alert Control Center with configurable opt-in channels and frequency. |
| **075** | `075_comprehensive_security_hardening.sql` | Security definer review, search_path enforcement, and injection guards. |
| **076** | `076_measurement_multiline_and_steel_bbs.sql` | Multi-line measurement formulas and TMT Bar Bending Schedule ($d^2/162$) schema. |
| **077** | `077_statutory_deductions_full_pwd_breakdown.sql` | Complete breakdown of CPWD statutory deductions (SD, IT-TDS, GST-TDS, Cess, Royalty). |
| **078** | `078_harden_rbac_and_fail_closed_security.sql` | **Fail-closed security**: `get_user_role()` fails to `viewer`; e-MB certification locks; billed row deletion blockers. |

---

## 3. Statutory & Engineering Compliance Standards

1. **CPWD Works Manual 2024**:
   - Clause 5: Extension of Time and Hindrance Recording.
   - Clause 7: Interim Running Account Payments & Certification Timelines.
   - Clause 8A / 8B: Completion Plans & Final Measurement Submission.
   - Clause 10CA & 10CC: Material, Bitumen, Steel & Labour Price Escalation.
   - Clause 12: Permissible Limits of Deviations, Extra Items & Market Rate Sanctions.
2. **IS 1200 / SP 27**:
   - Standard Method of Measurement of Building and Civil Engineering Works.
   - Measurement item deduction rules (voids, recesses, overlap exclusions).
3. **MORTH 5th Revision & IRC Guidelines**:
   - Earthwork, subgrade, granular sub-base (GSB), wet mix macadam (WMM), dense bituminous macadam (DBM), and bituminous concrete (BC) tolerances.
4. **CAG & Central Treasury Guidelines**:
   - Form CPWA-26 and CPWA-24 Running Account Bill Vouchers.
   - Reconciled deduction registers for IT u/s 194C, GST-TDS, and State BOCW Welfare Cess.
