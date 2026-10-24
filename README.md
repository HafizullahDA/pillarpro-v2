# PillarPro v2

> **Enterprise Civil Infrastructure Operating System for Indian Contractors & EPC Builders**

PillarPro v2 is an authoritative, mobile-first construction ERP engineered specifically for civil engineering contractors executing government-tendered infrastructure packages (CPWD, State PWD, NHAI, PMGSY, Railways, Irrigation, and Commercial EPC). It replaces fragile spreadsheets with a centralized, tamper-proof accounting and measurement ledger that tracks every rupee from field chainage to treasury realization.

---

## 🏗️ Core Architecture & Four Pillars Engine

### 1. 📐 Pillar 01 — Contract & Sanctioned BOQ Master
- **Tender BOQ Import & SOR Code Library**: Structure multi-crore bills of quantities with standard Schedule of Rates (SOR) items, non-scheduled items, and item rate ceilings.
- **Unbalanced Bid Protection**: Real-time algorithmic detection of front-loaded rates, zero-rate items, and quantity variation risks.
- **Price Escalation (CPWD Clause 10CA & 10CC)**: Automated indices computation for cement, steel rebar, bitumen, labor wages, and POL fuel.
- **Variation Threshold Monitoring**: Automatic warnings when executed item quantities approach statutory limits (+/- 10% or +/- 25%).

### 2. 📏 Pillar 02 — Digital e-MB & Chainage Measurement Sheets
- **IS 1200 Digital Electronic Measurement Book (e-MB)**: Mobile-first field measurement entry ($L \times B \times D$) by chainage with positive items and automated deduction math (openings, recesses, bearing plinths).
- **TMT Bar Bending Schedule (BBS)**: Built-in rebar detailing for 8mm–32mm Fe-550D rebar, calculating cutting lengths, bar counts, total meters, and unit weight ($d^2/162$) in Metric Tons (MT).
- **Level Book Reduced Levels (RL)**: Collimation checks with Benchmarks, Back Sight (BS), Intermediate Sight (IS), Fore Sight (FS), and Height of Instrument (HI).
- **Cryptographic Immutability Lock**: Prevents post-certification tampering; certified and billed e-MB entries are permanently locked against unauthorized edits and deletion.

### 3. 🏛️ Pillar 03 — Running Account (RA) Bills & Form 26 Engine
- **CPWD Form 26 Cumulative Billing**: Automated calculation of incremental work done, prior bill offsets, and current net payable.
- **Statutory Deductions & Recoveries Schedule**:
  - Security Deposit / Retention Money (5% or 10%)
  - Income Tax TDS u/s 194C (2% or 1%)
  - GST-TDS (2% under Section 51 of CGST Act)
  - BOCW Labour Welfare Cess (1% under BOCW Act 1996)
  - Mobilization Advance Principal Recovery (CPWD Form 35-A / Clause 10B)
  - Mining Royalty Deductions on Minor Minerals (Stone, Sand, Aggregates)
  - Departmental withholds and time-extension penalties
- **Tally Prime & ERP Double-Entry Journal Export**: 1-click XML and CSV export ready for instant import into Tally Prime 4.x, Tally ERP 9, Busy, and SAP B1 without manual ledger re-typing.

### 4. 🛡️ Pillar 04 — Site Operations & ContractIQ AI Legal Defense
- **Daily Progress Reports (DPR)**: Comprehensive site diaries logging weather, manpower gang muster rolls, work progress, and geotagged photographic evidence.
- **Machinery & Diesel Logs**: Heavy fleet plant tracking (Excavators, Rollers, Graders, Dumpers), hour-meter logs, and fuel issuance registers.
- **Store Inventory & Materials Khata**: Cement bags, structural steel, aggregates, and fuel stock balances with automated wastage threshold alerts.
- **Hindrance Register & Automated EOT Claim Engine (CPWD Form 14)**:
  - Systematic logging of client hindrances (site handover, drawing delays, utility shifting, forest clearance, unseasonal rains, delayed running payments).
  - Classification of concurrent vs. non-concurrent delays to defeat Liquidated Damages (LD) and milestone penalties.
  - 1-click generation of statutory CPWD Form 14 Extension of Time (EOT) packages.
- **ContractIQ AI Legal Defense Engine**:
  - Powered by **Google Gemini Flash** multimodal models (`@google/genai`).
  - Analyzes contract clauses against site events in English and Hindi.
  - Automatically drafts statutory time-bar notices, delay letters, and dispute claim binders.

---

## 👥 10-Tier Construction RBAC & Fail-Closed Security

PillarPro enforces a strict, fail-closed access control hierarchy backed by database-level PostgreSQL Row Level Security (RLS) policies:

| Role | Operational Scope | Key Permissions & Authority |
| :--- | :--- | :--- |
| **Owner** | All Organization Projects | Full executive authority, financial closures, contract amendments, tenant administration, deletion authorization. |
| **Admin** | Organization Wide | User management, invite codes, role assignments, platform and alert configurations. |
| **Project Manager** | Assigned / All Packages | Physical execution, DPR approvals, hindrance logging, machinery allocation, and site milestone oversight. |
| **Billing Engineer** | Assigned Projects | RA Bill generation, CPWA Form 26 abstracts, measurement reconciliation, and certificate submission. |
| **Site Engineer** | Assigned Site Packages | Mobile chainage measurements ($L \times B \times D$), Level Book RL entries, GPS photo verification, and e-MB submission. |
| **Site Supervisor** | Assigned Site | Daily worker muster rolls, attendance recording, and equipment diesel consumption logging. |
| **Store Manager** | Site Warehouses | Raw material receipts, store inventory, cement/rebar registers, gate passes, and wastage logging. |
| **Data Entry** | Assigned Modules | Operational data entry with restricted amendment permissions. |
| **Viewer** | Assigned Scope | Strictly read-only access for external auditors, financial consultants, and client observers (Fails Closed). |

> **Fail-Closed Security Guarantee (Migration 078)**: If a user has no row in `public.roles` within their active organization, the system never falls back to `owner`. It verifies if the user is explicitly the `created_by` / `owner_id` of the organization, and otherwise strictly **fails closed to `'viewer'`** (read-only).

---

## 📲 Automated WhatsApp Cloud API & Alert Dispatch Engine

- **Morning Operational Briefing**: Dispatches daily work targets, pending measurement clearances, and plant mobilization schedules to site teams.
- **Evening Labor & Muster Alert**: Automated daily attendance headcount and wage liability summary to Head Office management.
- **Bank Guarantee (BG) Expiry Countdown**: Automated alerts at 30, 15, and 7 days prior to PBG, FDR, or EMD maturity.
- **Payment Delay Escalation**: Automated alerts when running account bills remain uncertified beyond statutory timelines (CPWD Clause 7).

---

## 🛠️ Modern Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React Server Components, Server Actions)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15, Multi-tenant Row Level Security, Storage, Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI & Multimodal OCR**: [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai) (Gemini Flash OCR & ContractIQ Engine)
- **Messaging**: Meta WhatsApp Cloud API via secure webhook dispatchers
- **Accounting Compatibility**: Tally Prime 4.x / ERP 9 XML & CSV Double-Entry Export
- **Testing**: [Vitest](https://vitest.dev/) (307 automated unit and integration tests)
- **Formatting**: Indian Rupee currency standard (`en-IN` numbering: Lakhs and Crores)

---

## 🗄️ Database Migrations Overview (001 – 078)

All database schema evolutions are version-controlled in [`supabase/migrations/`](./supabase/migrations/):

| Migration | Description |
| :--- | :--- |
| `001_initial_schema.sql` | Core schema (projects, workers, attendance, ledger, expenses). |
| `002_rls_policies.sql` | Base Row Level Security policies across primary tables. |
| `003_phase2_additions.sql` | Accounting periods and month-closure check functions. |
| `004_fix_user_profiles_roles_rls.sql` | User profiles, role synchronization, and `get_user_role()`. |
| `005_grant_authenticated_table_permissions.sql` | Authenticated role table grants. |
| `006_add_email_to_user_profiles.sql` | Added email column to user profiles for admin listings. |
| `007_supplier_account_schema.sql` | Supplier accounts master, supplier transactions ledger, and summary view. |
| `008_ra_bill_tracker_schema.sql` | RA Bill tracker, retention withholding, and security deposits schema. |
| `009_fix_ra_bill_outstanding_formula.sql` | Corrected generated column formulas for net payable and outstanding balance. |
| `010_statutory_deductions_and_payments_ledger.sql` | Tranche-level treasury payments ledger (`ra_bill_payments`) and statutory deductions roll-up. |
| `011_project_archive_soft_delete.sql` | Owner project archiving and soft-deletion capability. |
| `012_owner_expense_delete_and_ledger_sync.sql` | Owner-restricted expense deletion with automated ledger cleanup triggers. |
| `013_migrate_vendors_to_suppliers.sql` | Consolidated Vendors into Suppliers with quantity/rate/unit and ledger sync triggers. |
| `014_ra_bill_cumulative_mode.sql` | CPWD Form 26 Cumulative Billing Mode with prior bill reference and incremental calculations. |
| `015_owner_supplier_delete.sql` | Owner-restricted supplier deletion with cascading foreign key constraints and RPC guard. |
| `016_bill_deductions.sql` | Flexible itemized deductions table for Royalty, GST on Royalty, TCS, and departmental penalties. |
| `017_expand_user_roles.sql` | Expanded user roles to support modern contractor hierarchy. |
| `018_attendance_and_workers_rls.sql` | RLS security policies for worker masters and daily muster attendance rolls. |
| `019_organizations_schema.sql` | Multi-tenant organizational workspaces (`organizations` table and tenancy scoping). |
| `020_demo_organization_and_rls_isolation.sql` | Tenant-scoped RLS policies isolating firm data. |
| `021_partner_capital_and_project_shares.sql` | Partner equity accounts, project profit sharing, and capital infusions. |
| `022_wage_tracking_ledger.sql` | Worker wage register, payment tracking, and wage disbursement records. |
| `023_remove_demo_organization.sql` | Cleaned up hardcoded demo organizations. |
| `024_self_serve_onboarding.sql` | Automated contractor self-serve firm creation RPC (`onboard_contractor`). |
| `025_team_management_and_org_scoping.sql` | Firm invite codes, team invitations, and role-based staff onboarding. |
| `026_workers_organization_id_default.sql` | Enforced default `organization_id` assignment on worker creations. |
| `027_delete_worker.sql` | Safe worker deletion function with cascading attendance checks. |
| `028_suppliers_organization_id_default.sql` | Enforced default `organization_id` on supplier creation. |
| `029_remove_team_member.sql` | Secure team member offboarding RPC with role-revocation checks. |
| `030_machinery_and_diesel.sql` | Heavy plant & machinery registers, equipment logs, and diesel fuel tracking. |
| `031_daily_progress_reports.sql` | DPR master tables, weather tracking, gang counts, and site photo evidence. |
| `032_fix_security_definer_view.sql` | Fixed postgres view security invoker attributes across summary projections. |
| `033_store_inventory.sql` | Store inventory, stock receipts, material issuances, and warehouse balances. |
| `034_org_branding_and_inventory_wastage.sql` | Custom firm logos, letterhead branding, and material wastage logging. |
| `035_projects_organization_id_default.sql` | Automated tenant assignment on project creation. |
| `036_add_carriage_to_supplier_transactions.sql` | Added freight, carriage, and handling charges to supplier bills. |
| `037_boq_and_work_done_tracking.sql` | Initial BOQ line item structure and physical progress measurement tracking. |
| `038_cpwa_ra_bill_enhancements.sql` | Full CPWA Form 26 print layouts and statutory deduction headers. |
| `039_fix_onboarding_and_auto_activate.sql` | Auto-activation pipeline for primary contractor account owners. |
| `040_hindrance_register_and_eot_engine.sql` | Hindrance register schema, delay days computation, and EOT request tracking. |
| `041_subscription_lifecycle_and_entitlements.sql` | Subscription tier enforcement, project limits, and feature flags. |
| `042_attendance_overtime.sql` | Overtime hours tracking and proportional wage calculation. |
| `043_fix_receivables_bills_rls.sql` | Fixed RLS edge cases in receivables and billing views. |
| `044_partners_organization_id_default_and_rls.sql` | Scoped partner equity ledgers to active organization. |
| `045_org_profile_include_subscription_fields.sql` | Extended organization profiles with active subscription metadata. |
| `046_rich_sample_highway_project.sql` | Seed generator for demonstration highway EPC packages. |
| `047_visitor_telemetry_and_platform_admins.sql` | Landing page telemetry tracking and platform admin directories. |
| `048_fix_hindrances_and_eot_rls.sql` | Fixed RLS policy grants on hindrance register entries. |
| `049_fix_join_organization_role_cast.sql` | Fixed enum casting when joining organizations with user profiles. |
| `050_additional_security_deposit_enum.sql` | Added Performance Guarantee (PG) and Additional Security Deposit (ASD) enums. |
| `051_contract_master_schema.sql` | Comprehensive `contracts` master table with tender values and DLP dates. |
| `052_boq_master_and_revisions_schema.sql` | Sanctioned BOQ items, SOR codes, and formal revision audit history. |
| `053_measurement_module_schema.sql` | `measurement_books`, `measurement_entries`, and IS 1200 measurement items. |
| `054_measurement_ra_bill_integration.sql` | Linkage bridging certified e-MB measurement entries into RA bills. |
| `055_contract_events_and_hindrance_register.sql` | Contractual milestone events, hindrances, and concurrent delay classification. |
| `056_evidence_vault_and_completeness.sql` | Geo-tagged site evidence vault and documentary completeness scoring. |
| `057_correspondence_and_notice_tracking.sql` | Formal contractual letters, delay notices, and statutory time-bar tracking. |
| `058_contract_clause_management.sql` | Contract clause library (CPWD, FIDIC, MORTH, State PWD GCC/SCC). |
| `059_extension_of_time_module.sql` | Formal Extension of Time (EOT) claim package generator per CPWD Form 14. |
| `060_contract_variations_module.sql` | Clause 12 variation sanction tracking for extra, substituted, and deviated items. |
| `061_contract_claims_module.sql` | Formal dispute claims, price escalation claims, and arbitration binders. |
| `062_rbac_and_immutable_audit_trail.sql` | Construction RBAC permissions matrix and cryptographic measurement locks. |
| `063_measurement_rls_and_integrity_locks.sql` | Database triggers enforcing immutability on certified and billed e-MBs. |
| `064_fix_sample_project_seeding_and_security_deposit_rls.sql` | Hardened sample data seeders and security deposit policies. |
| `065_exclusive_visitor_telemetry_and_stay_duration.sql` | Advanced visitor engagement analytics and duration telemetry. |
| `066_fix_auth_user_cascades_and_deletion.sql` | Clean cascading deletion when terminating test or decommissioned users. |
| `067_fix_sample_project_seeding_and_onboarding.sql` | Enhanced automated onboarding pipeline with complete highway BOQ seeds. |
| `068_fix_tenant_isolation_and_rls_leakage.sql` | Strict tenant-scoping patch across all enterprise RPCs and background views. |
| `069_fix_financial_accuracy_and_gap_closures.sql` | Arithmetic precision fixes for retention calculations and cumulative offsets. |
| `070_record_level_activity_audit_logs.sql` | Enterprise `activity_audit_logs` tracking user IP, agents, and entity state diffs. |
| `071_alert_dispatch_logs_and_preferences.sql` | WhatsApp and system alert logging, retry queue, and delivery receipts. |
| `072_phase2_cashflow_and_vendor_alerts.sql` | Background cash flow scanners and vendor payment due dispatchers. |
| `073_phase3_operations_and_fleet_alerts.sql` | Automated dispatch for machinery diesel usage and daily site muster rolls. |
| `074_phase4_alert_preferences_and_control_center.sql` | Contractor Alert Control Center with configurable opt-in channels and frequency. |
| `075_comprehensive_security_hardening.sql` | Security definer review, search_path enforcement, and injection guards. |
| `076_measurement_multiline_and_steel_bbs.sql` | Multi-line measurement formulas and TMT Bar Bending Schedule ($d^2/162$) schema. |
| `077_statutory_deductions_full_pwd_breakdown.sql` | Complete breakdown of CPWD statutory deductions (SD, IT-TDS, GST-TDS, Cess, Royalty). |
| `078_harden_rbac_and_fail_closed_security.sql` | **Fail-closed security**: `get_user_role()` fails to `viewer`; e-MB certification locks; billed row deletion blockers. |

---

## 🩺 System Health & Monitoring

PillarPro exposes a dedicated, unauthenticated health check endpoint for synthetic uptime monitors (e.g. BetterUptime, UptimeRobot, Datadog):

- **Endpoint:** `GET /api/health`
- **Behavior:** Executes a live probe against Supabase to verify database connectivity and returns round-trip latency.
- **Response Format:**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "latencyMs": 42,
    "timestamp": "2026-10-24T08:55:00.000Z",
    "timestampIST": "24/10/2026, 02:25:00 pm (IST)",
    "version": "2.0.0",
    "environment": "production"
  }
  ```
- **Status Codes:** Returns `200 OK` when healthy, or `503 Service Unavailable` if database connectivity drops.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- A Supabase project with database credentials
- A Google Gemini API key (for OCR receipt scanning and ContractIQ AI)
- Meta WhatsApp Cloud API credentials (for automated SMS / WhatsApp dispatch)

### 1. Clone the repository
```bash
git clone https://github.com/HafizullahDA/pillarpro-v2.git
cd pillarpro-v2
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Apply Database Migrations
Run the SQL migration scripts in sequence (or your latest pending migration) within the **Supabase SQL Editor** from the [`supabase/migrations/`](./supabase/migrations/) directory.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 6. Run Test Suite
```bash
npm test
```

### 7. Build for Production
```bash
npm run build
npm run start
```

---

## 📄 License
Private commercial software built for PillarPro civil contracting operations. All rights reserved.
