# PillarPro v2

> **Mobile-First Construction ERP for Government Civil Contracting & Infrastructure Firms**

PillarPro v2 is an enterprise-grade, mobile-responsive management system tailored specifically for civil engineering contractors executing simultaneous government-contracted projects (CPWD, PWD, NHPC, PMGSY, Railways, Irrigation). It eliminates messy spreadsheet tracking by grounding every financial, procurement, labor, and billing event in a single centralized ledger.

---

## 🏗️ Core Architecture & Design Philosophy

1. **Centralized Ledger as the Single Source of Truth**:
   - Every material procurement, supplier payment, site expense, attendance wage event, and partner movement automatically writes to `public.ledger`.
   - The Executive Dashboard and reporting views are live read-projections of the ledger, eliminating reconciliation mismatches.
2. **CPWD & Government Tendering Standard Compliance**:
   - Built to handle CPWD Form 26 / Standard Measurement Book (MB) cumulative billing, statutory deductions (TDS, GST-TDS, Labour Cess), and departmental withholdings (Royalty, DMFT, Time-Extension penalties).
3. **Database-Enforced Security (RLS)**:
   - Access control is enforced at the Postgres database level using Row Level Security (RLS) and `SECURITY DEFINER` functions, not just UI visibility toggles.
4. **Accounting Period Integrity (Month Close)**:
   - Closed accounting periods prevent non-Owner edits, safeguarding financial audits.

---

## 👥 User Roles & Permissions

| Role | Scope | Key Permissions |
| :--- | :--- | :--- |
| **Owner** | All projects | Full CRUD access across all modules; project creation, archiving, and deletion; user approvals and role assignments; month close lock/unlock; expense & supplier deletion. |
| **Managing Partner** | All projects | Full operational read/write on Suppliers, Expenses, Attendance, RA Bills, and Receivables; blocked from deleting closed-period entries, deleting suppliers/expenses, or altering core contract scopes. |
| **Site Supervisor** | Assigned projects only | Mobile site entry for daily labor Attendance and site Expenses; read-only access to their specific project's summary; blocked from central financial modules, Partner accounts, and admin tools. |

---

## 📦 System Modules & Capabilities

### 1. 📊 Executive Dashboard (`/dashboard`)
- **KPI Summary Cards**: Total Expense, Total Received, Net Cash Position, Net Liquidity Position, Outstanding Government Receivables, and Supplier Dues.
- **Cash Flow Analytics**: Trailing 6-month visual cash flow trend (Treasury Inflow vs. Site Expense).
- **Receivables Aging**: Dynamic aging bands (0–30 days, 31–60 days, 60+ days) for pending treasury disbursements.
- **Projects at a Glance**: Compact status indicators with financial health cards and direct navigation to project files.

### 2. 🏛️ Government RA Bills & Guarantee Tracker (`/ra-bills`)
- **Dual Billing Modes**:
  - **Standalone Mode**: Independent certified bills.
  - **Cumulative Mode (CPWD Form 26)**: Contract-to-date work certified from the Measurement Book with automatic prior bill detection and live calculation of net-new work and net payable this bill.
- **Statutory Deductions & Net Bank Cash**:
  - Automatically breaks down gross treasury releases into TDS (IT u/s 194C), GST-TDS (Sec 51), and BOCW Labour Welfare Cess (1%).
- **Flexible Additional Deductions Engine**:
  - Multi-line itemized departmental deductions for Royalty, GST on Royalty, TCS, DMFT, and Time-Extension withholds (`public.bill_deductions`).
- **Security Deposits & Bank Guarantees (PBG / SD / EMD / FDR)**:
  - Tracks performance bank guarantees, fixed deposit receipts, and claim expiry dates with visual alert statuses.

### 3. 📦 Supplier Accounts (`/suppliers`)
- Complete vendor-to-supplier migration (`public.suppliers` and `public.supplier_transactions`).
- Material-level tracking with optional **Quantity**, **Rate**, and **Unit** (tonnes, bags, cum, kg, nos).
- Real-time running balance calculation (Total Procured, Total Paid, Outstanding Balance Due).
- Chronological supplier statements with PDF/print view.
- **Owner-Restricted Deletion**: Strict database RLS and confirmation modal to safely purge unneeded suppliers and cascade ledger cleanups.

### 4. 👷 Site Attendance & Labor Master (`/attendance`)
- Worker master directory with trades/roles and daily wage rates.
- Horizontal day-picker for site supervisors to mark present/absent/half-day entries on-site.
- Real-time daily labor cost computation tied to project wage profiles.

### 5. 🧾 Miscellaneous Expenses & AI Receipt Scanner (`/expenses`)
- Categorized site expense tracking (fuel, equipment hire, transport, tendering fees, administrative).
- **AI OCR Receipt Scanner (`/api/scan-receipt`)**: Multimodal receipt processing using **Google Gemini Flash** to extract vendor name, GSTIN, amount, date, and line items from camera photos.
- Receipt images stored securely in Supabase Storage.
- Owner-only expense deletion with automated ledger reversal.

### 6. 🤝 Partner Accounts (`/partners`)
- Tracks partner capital infusions and profit drawings.
- Supports both project-specific investments and firm-level / unassigned capital accounts.
- Chronological partner transaction ledger and net equity positions.

### 7. 🔒 Period Lock & Month Close (`/admin/periods`)
- Project-wise accounting period lock engine.
- Prevents post-audit backdating or tampering by non-Owner accounts.

### 8. 🛡️ User Management & Access Control (`/admin/users`)
- New sign-ups land in a secure `pending` state.
- Owners review, approve, assign roles (Owner, Managing Partner, Site Supervisor), and designate project access.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15, Row Level Security, Storage, Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI / Vision**: [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai) (Gemini Flash OCR)
- **Icons & UI**: Custom accessible SVG iconography, modular Drawer and Modal primitives
- **Formatting**: Indian Rupee currency formatting (`en-IN` numbering: Lakhs and Crores)

---

## 🗄️ Database Migrations Overview

All database schema evolutions are version-controlled in [`supabase/migrations/`](./supabase/migrations/):

| Migration | Description |
| :--- | :--- |
| `001_initial_schema.sql` | Core database schema (projects, workers, attendance, ledger, expenses). |
| `002_rls_policies.sql` | Base row level security policies across core tables. |
| `003_phase2_additions.sql` | Accounting periods, period locking triggers, and soft-delete functions. |
| `004_fix_user_profiles_roles_rls.sql` | User profiles, role synchronization, and `get_user_role()` RPC. |
| `005_grant_authenticated_table_permissions.sql` | Authenticated role table grants. |
| `006_add_email_to_user_profiles.sql` | Added email column to user profiles for admin listings. |
| `007_supplier_account_schema.sql` | Supplier accounts master, supplier transactions ledger, and summary view. |
| `008_ra_bill_tracker_schema.sql` | RA Bill tracker, retention withholding, and security deposits schema. |
| `009_fix_ra_bill_outstanding_formula.sql` | Corrected generated column formulas for net payable and outstanding balance. |
| `010_statutory_deductions_and_payments_ledger.sql` | Tranche-level treasury payments ledger (`ra_bill_payments`) and statutory deductions roll-up. |
| `011_project_archive_soft_delete.sql` | Owner project archiving and soft-deletion capability. |
| `012_owner_expense_delete_and_ledger_sync.sql` | Owner-restricted expense deletion with automated ledger cleanup triggers. |
| `013_migrate_vendors_to_suppliers.sql` | Retired Vendors module, unified into Suppliers with quantity/rate/unit and ledger sync triggers. |
| `014_ra_bill_cumulative_mode.sql` | CPWD Form 26 Cumulative Billing Mode with previous bill reference and incremental calculations. |
| `015_owner_supplier_delete.sql` | Owner-restricted supplier deletion with cascading foreign key constraints and RPC guard. |
| `016_bill_deductions.sql` | Flexible itemized deductions table for Royalty, GST on Royalty, TCS, and departmental penalties. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- A Supabase project with database credentials
- A Google Gemini API key (for OCR receipt scanning)

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

### 6. Build for Production
```bash
npm run build
npm run start
```

---

## 📄 License
Private commercial software built for PillarPro civil contracting operations. All rights reserved.