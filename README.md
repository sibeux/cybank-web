# 🏦 Cybank — Personal Finance & Cashflow Ledger

A modern personal finance and cashflow management web application with a **Single Source of Truth** backend architecture designed to serve both the **Web Frontend** and future **Native Android (Kotlin)** mobile clients.

---

## 🚀 Tech Stack & Design Decisions

| Component | Technology | Rationale & Architectural Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router, Static Export SPA)** | React 19 web client exported as high-performance static files (`output: "export"`) with `basePath: "/cybank"`. |
| **Styling & UI** | **Tailwind CSS v4 + Lucide Icons** | Utility-first styling with mobile-first responsiveness, ensuring seamless usability across mobile phones and desktop displays. |
| **Backend & RESTful API** | **PHP Native (PDO MySQL / MariaDB)** | Lightweight, zero-overhead REST API in `/api` (`api/index.php` sebagai router + satu file per endpoint di `api/endpoints/`), optimized for shared hosting (cPanel/Apache) without Node.js daemon dependency. |
| **Database** | **MariaDB / MySQL** | Shared database environment using explicit `cybank_*` table prefixes to guarantee complete isolation from existing shared services. |
| **Authentication** | **Cybeat SSO (JWT Bearer Token)** | Stateless Bearer authentication (`Authorization: Bearer <access_token>`) verified against `https://cybeat.sibeux.my.id/api/auth/login`. |
| **Local Dev Runner** | **Concurrently** | Runs both PHP local server (`php -S 127.0.0.1:8000 api/router.php`) and Next.js dev server concurrently with auto-proxying rewrites. |
| **Deployment & CI/CD** | **GitHub Actions + SSH Deploy** | Automatic build and deployment to shared hosting (`public_html/cybank`) via SSH on push to `main`. Also regenerates the landing page commit history feed (`src/data/git-commits.json`) from `git log` before each build. |
| **Data Importer** | **PapaParse & PHP CSV Batch Engine** | High-performance CSV parser to import and map legacy transaction records (BudgetBakers Wallet export format). |

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients"]
        WEB["🌐 Web Application (Next.js Static SPA /cybank)"]
        ANDROID["📱 Mobile App (Android Native Kotlin / Retrofit - Planned)"]
    end

    subgraph Auth["Identity Provider"]
        SSO["🔐 Cybeat SSO (https://cybeat.sibeux.my.id/api/auth/login)<br/>Returns JWT: sub (user_id), email, name"]
    end

    subgraph Backend["Cybank Backend (PHP Native REST API)"]
        ROUTER["⚙️ Router & Shared Helpers (api/index.php, api/config.php, api/endpoints/)"]
        API_AUTH["📁 /api/auth (login, me, logout)"]
        API_DASHBOARD["📁 /api/dashboard"]
        API_ACCOUNTS["📁 /api/accounts & /api/accounts/recount"]
        API_CATEGORIES["📁 /api/categories"]
        API_TRANSACTIONS["📁 /api/transactions"]
        API_ANALYTICS["📁 /api/analytics & /api/stats"]
        API_IMPORT["📁 /api/import"]
        PDO["⚡ PHP PDO MySQL Connection"]
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

    WEB -->|Bearer Token + API Requests| ROUTER
    ANDROID -.->|Bearer Token + API Requests| ROUTER

    ROUTER --> API_AUTH & API_DASHBOARD & API_ACCOUNTS & API_CATEGORIES & API_TRANSACTIONS & API_ANALYTICS & API_IMPORT
    API_AUTH & API_DASHBOARD & API_ACCOUNTS & API_CATEGORIES & API_TRANSACTIONS & API_ANALYTICS & API_IMPORT --> PDO
    PDO --> T_ACC & T_CAT & T_TX
```

---

## 🗄️ Database Schema

All tables use the `cybank_` prefix to ensure zero naming collisions on shared database instances:

1. **`cybank_accounts`**: Manages financial accounts (e.g., Cash, Bank BCA, e-Wallets, Investments).
   * Fields: `id`, `user_id`, `name`, `type` (`CASH`, `BANK`, `EWALLET`, `INVESTMENT`, `GOAL`, `SAVING`, `CREDIT_CARD`, `LOAN`), `currency`, `balance`, `created_at`, `updated_at`.
2. **`cybank_categories`**: Transaction categories for expense and income classification.
   * Fields: `id`, `user_id`, `name`, `type` (`EXPENSE`, `INCOME`), `icon`, `color`, `envelope_id`.
3. **`cybank_transactions`**: Financial records tracking expenses, income, and inter-account transfers.
   * Fields: `id`, `user_id`, `account_id`, `category_id`, `transfer_to_account_id`, `amount`, `type` (`EXPENSE`, `INCOME`, `TRANSFER`), `payment_type`, `note`, `payee`, `labels`, `transaction_date`.

---

## 🔌 RESTful API Specification (`/api/` & `/api/v1/`)

Stateless JSON endpoints powered by PHP Native (`api/index.php`), accessible by Web and Android Kotlin clients:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate with Cybeat SSO credentials and issue JWT session |
| `POST` | `/api/auth/refresh` | Renew expired access token using refresh token |
| `GET` | `/api/auth/me` | Get current authenticated user info from token payload |
| `POST` | `/api/auth/logout` | End user session |
| `GET` | `/api/dashboard` | Fetch aggregated dashboard data (accounts, categories, recent transactions, monthly summary) |
| `GET` | `/api/accounts` | Retrieve all accounts and current balances |
| `POST` | `/api/accounts` | Create a new financial account/wallet |
| `PUT` | `/api/accounts` | Update account details |
| `DELETE` | `/api/accounts` | Delete an account (and remove associated transactions) |
| `POST` | `/api/accounts/recount` | Recount and reconcile account balance against transaction history |
| `GET` | `/api/categories` | List expense and income categories |
| `POST` | `/api/categories` | Add a custom category |
| `PUT` | `/api/categories` | Edit category name or properties |
| `DELETE` | `/api/categories` | Remove a category |
| `GET` | `/api/transactions` | Paginated transactions with date range, category, and account filters |
| `POST` | `/api/transactions` | Record a new expense, income, or transfer transaction |
| `PUT` | `/api/transactions` | Update an existing transaction and adjust account balances |
| `DELETE` | `/api/transactions` | Remove a transaction and revert balance change |
| `GET` | `/api/stats` | Monthly cashflow stats (income, expense, net balance) |
| `GET` | `/api/analytics` | Cashflow and category analytics for trend charts (7d, 30d, 6m, 1y, all) |
| `POST` | `/api/import` | Upload and batch-process legacy CSV export files |

> **Required Request Header**:
> ```http
> Authorization: Bearer <access_token_from_cybeat_sso>
> ```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v20 or v22+
- **PHP**: >= 8.0 with `pdo_mysql` and `curl` extensions
- **MariaDB / MySQL**: Database server

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your database credentials:
```env
DB_HOST="localhost"
DB_PORT="3306"
DB_DATABASE="cybank_db"
DB_USERNAME="cybank_user"
DB_PASSWORD="your_db_password"
DATABASE_URL="mysql://cybank_user:your_db_password@localhost:3306/cybank_db"
SSO_LOGIN_URL="https://cybeat.sibeux.my.id/api/auth/login"
```

### 2. Start Development Server
Jalankan perintah berikut untuk menyalakan server PHP backend (`http://127.0.0.1:8000`) dan Next.js frontend (`http://localhost:3000`) secara bersamaan:
```bash
npm run dev
```

Next.js secara otomatis melakukan rewrite request `/cybank/api/*` ke backend PHP pada port 8000.

Buka browser di:
```text
http://localhost:3000/cybank
```

### 3. Production Build & Deployment
Untuk membangun file statis frontend:
```bash
npm run build
```
Hasil build berada di direktori `out/`. Folder `api/` dan file `public/.htaccess` akan disalin bersama untuk hosting di shared hosting cPanel/Apache (`public_html/cybank`).

#### Landing Page Commit History Feed
Bagian **Recent Commit History** pada landing page tidak ditulis manual, tetapi dibaca dari `src/data/git-commits.json` yang dihasilkan oleh script:
```bash
npm run gen:commits
```
- Pada CI/CD, langkah `Generate commit history data` di `.github/workflows/deploy.yml` menjalankan script ini sebelum `npm run build`, sehingga feed selalu sesuai dengan commit yang di-deploy (branch dibaca dari `GIT_BRANCH`).
- Untuk preview lokal setelah commit baru, jalankan script-nya secara manual lalu commit ulang file JSON-nya — file ini sengaja ikut version control sebagai fallback agar `npm run build` di clone baru tetap jalan tanpa step CI.
- Jumlah entri dapat diubah lewat env `COMMIT_COUNT` (default 6).

---

## 📂 Project Directory Structure

```
cybank-web/
├── api/                      # 🐘 PHP Native RESTful API Backend
│   ├── config.php            # Database PDO connection, CORS headers, & env loader
│   ├── index.php             # REST API endpoint handlers (Auth, Transactions, Accounts, Analytics)
│   └── router.php            # PHP built-in server router for local development
├── public/
│   └── .htaccess             # Apache rewrite rules for SPA routing & PHP API forwarding
├── src/
│   ├── data/
│   │   └── git-commits.json   # Commit feed for landing page (generated, committed as fallback)
│   ├── app/
│   │   ├── layout.tsx        # Root HTML layout & fonts
│   │   ├── page.tsx          # Single Page Application entry point
│   │   └── login/            # Login page with Cybeat SSO integration
│   ├── components/           # Reusable React UI components
│   │   ├── DashboardClient.tsx        # Main dashboard, quick actions & modals
│   │   ├── TransactionHistorySection.tsx # Transaction ledger, filters & pagination
│   │   ├── CashflowCharts.tsx         # Cashflow & analytics charts (Chart.js)
│   │   ├── EditTransactionModal.tsx   # Modal edit/update transaction
│   │   └── RecountBalanceModal.tsx    # Modal recount & balance adjustment
│   └── lib/                  # Utilities & helpers
│       ├── api.ts            # Base API URL helper (/cybank)
│       └── date.ts           # Local datetime formatter helper
├── scripts/
│   └── generate-git-commits.mjs # git log -> src/data/git-commits.json (run by CI before build)
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI/CD GitHub Actions for production deployment
├── next.config.ts            # Next.js export & dev rewrite configuration
├── package.json
└── README.md
```
