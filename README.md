# 🏦 Cybank — Personal Finance & Cashflow Ledger

A modern personal finance and cashflow management web application with a **Single Source of Truth** backend architecture designed to serve both the **Web Frontend** and future **Native Android (Kotlin)** mobile clients.

---

## 🚀 Tech Stack & Design Decisions

| Component | Technology | Rationale & Architectural Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Fullstack TypeScript framework providing both a responsive Web client and clean REST API route handlers (`/api/v1/`) within a single unified codebase. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Utility-first styling with mobile-first responsiveness, ensuring seamless usability across mobile phones and desktop displays. |
| **Backend & API** | **Next.js Route Handlers (`/api/v1/`)** | Pure HTTP JSON REST API consumed by the Web client today and directly consumable by Android (Retrofit / Ktor) in the future. |
| **Database** | **MariaDB / MySQL** | Shared database environment using explicit `cybank_*` table prefixes to guarantee complete isolation from existing shared services. |
| **ORM & Migrations** | **Prisma ORM (Code-First)** | Code-first database migrations (`npx prisma migrate dev`), declarative schema definition, strict type-safety, and auto-generated TypeScript models. |
| **Authentication** | **Cybeat SSO (JWT Bearer Token)** | Stateless Bearer authentication (`Authorization: Bearer <access_token>`) via `https://cybeat.sibeux.my.id/api/auth/login`. Eliminates redundant user tables and registration logic. |
| **Data Importer** | **PapaParse CSV Engine** | High-performance client/server CSV parser to import and map ~2,900+ legacy transaction records (BudgetBakers Wallet export format). |

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients"]
        WEB["🌐 Web Application (Next.js / React)"]
        ANDROID["📱 Mobile App (Android Native Kotlin / Retrofit - Planned)"]
    end

    subgraph Auth["Identity Provider"]
        SSO["🔐 Cybeat SSO (https://cybeat.sibeux.my.id/api/auth/login)<br/>Returns JWT: sub (user_id), email, name"]
    end

    subgraph Backend["Cybank Backend (Next.js App Router)"]
        MIDDLEWARE["🛡️ Auth Verification & JWT Guard (src/lib/auth.ts)"]
        API_ACCOUNTS["📁 /api/v1/accounts"]
        API_CATEGORIES["📁 /api/v1/categories"]
        API_TRANSACTIONS["📁 /api/v1/transactions"]
        API_IMPORT["📁 /api/v1/import"]
        PRISMA["⚡ Prisma Client (src/lib/db.ts)"]
    end

    subgraph Database["Shared MariaDB / MySQL"]
        T_ACC[("cybank_accounts")]
        T_CAT[("cybank_categories")]
        T_TX[("cybank_transactions")]
        OTHER_TABLES[("Existing Shared Tables...")]
    end

    WEB -->|1. Submit credentials| SSO
    ANDROID -.->|1. Submit credentials| SSO
    SSO -->|2. Return access_token & refresh_token| WEB
    SSO -.->|2. Return access_token & refresh_token| ANDROID

    WEB -->|Bearer Token + API Requests| MIDDLEWARE
    ANDROID -.->|Bearer Token + API Requests| MIDDLEWARE

    MIDDLEWARE --> API_ACCOUNTS & API_CATEGORIES & API_TRANSACTIONS & API_IMPORT
    API_ACCOUNTS & API_CATEGORIES & API_TRANSACTIONS & API_IMPORT --> PRISMA
    PRISMA --> T_ACC & T_CAT & T_TX
```

---

## 🗄️ Database Schema (Code-First Prisma)

All tables use the `cybank_` prefix to ensure zero naming collisions on shared database instances:

1. **`cybank_accounts`**: Manages financial accounts (e.g., Cash, Bank BCA, e-Wallets).
   * Fields: `id`, `user_id`, `name`, `type` (`CASH`, `BANK`, `EWALLET`, `CREDIT_CARD`), `currency`, `balance`, `created_at`, `updated_at`.
2. **`cybank_categories`**: Transaction categories for expense and income classification.
   * Fields: `id`, `user_id`, `name`, `type` (`EXPENSE`, `INCOME`), `icon`, `color`, `envelope_id`.
3. **`cybank_transactions`**: Financial records tracking expenses, income, and inter-account transfers.
   * Fields: `id`, `user_id`, `account_id`, `category_id`, `transfer_to_account_id`, `amount`, `type` (`EXPENSE`, `INCOME`, `TRANSFER`), `payment_type`, `note`, `payee`, `labels`, `transaction_date`.

---

## 🔌 REST API Specification (`/api/v1`)

Stateless JSON endpoints ready for Web and Android Kotlin clients:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/accounts` | Retrieve all accounts and current balances for the authenticated user |
| `POST` | `/api/v1/accounts` | Create a new financial account/wallet |
| `GET` | `/api/v1/categories` | List expense and income categories |
| `POST` | `/api/v1/categories` | Add a custom category |
| `GET` | `/api/v1/transactions` | Fetch paginated transactions with date range, category, and account filters |
| `POST` | `/api/v1/transactions` | Record a new expense, income, or transfer transaction |
| `POST` | `/api/v1/import` | Upload and batch-process legacy CSV export files |

> **Required Request Header**:
> ```http
> Authorization: Bearer <access_token_from_cybeat_sso>
> ```

---

## 🛠️ Getting Started

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your MariaDB database credentials:
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
SSO_LOGIN_URL="https://cybeat.sibeux.my.id/api/auth/login"
JWT_SECRET=""
```

### 2. Run Database Migrations
Apply the schema to MariaDB using Prisma code-first migration:
```bash
npx prisma migrate dev --name init_cybank_schema
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 📂 Project Directory Structure

```
cybank/
├── prisma/
│   └── schema.prisma         # Declarative schema definition and migrations
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Web UI pages (Dashboard, Transactions, Accounts, Import)
│   │   ├── api/v1/           # Single-source REST API for Web & Android Kotlin
│   │   ├── globals.css       # Global styles & Tailwind CSS configuration
│   │   └── layout.tsx
│   ├── components/           # Reusable UI widgets (Cards, Tables, Charts, Modals)
│   ├── lib/
│   │   ├── auth.ts           # Cybeat SSO JWT validation & user extraction
│   │   ├── db.ts             # Global Prisma Client instance
│   │   └── csv-parser.ts     # CSV transaction parser & importer
├── report_2026-10-29_181858.csv # Historical transaction records (~2,900 rows)
├── README.md                 # Project architecture & stack documentation
└── package.json
```
