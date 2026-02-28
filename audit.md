# Meu Concreto — Architecture Audit

> Generated: 2026-02-23

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.3 |
| Framework | Nuxt 4 (full-stack SSR) |
| UI | @nuxt/ui + Tailwind v4 |
| ORM | Drizzle ORM |
| DB | libsql (SQLite / Turso-compatible) |
| Validation | Zod |
| Auth | bcryptjs + cookie-based session |

---

## Database Schema (ER)

```mermaid
erDiagram
    companies {
        int id PK
        text name
        text document "CNPJ (unique)"
        text email
        text phone
        bool active
    }
    users {
        int id PK
        int company_id FK
        text name
        text email "unique"
        text document "CPF/CNPJ"
        text role "admin|manager|user"
        bool active
    }
    user_auth {
        int id PK
        int user_id FK "1:1"
        text password_hash
        text hwid "device binding"
        timestamp last_login
    }
    user_companies {
        int id PK
        int user_id FK
        int company_id FK
        text role "admin|manager|user"
        bool active
    }
    products {
        int id PK
        int company_id FK
        text name
        text type "concrete|pump|additive|rental|other"
        text unit "m3|un|hr|kg|ton"
        int price "cents"
        int fck "MPa"
        int slump "cm"
        bool active
    }
    quotes {
        int id PK
        int company_id FK
        int user_id FK
        text customer_name
        text status "draft|sent|approved|rejected|expired"
        int subtotal "cents"
        int discount "cents"
        int total "cents"
    }
    quote_items {
        int id PK
        int quote_id FK
        int product_id FK
        text product_name "snapshot"
        real quantity
        int unit_price "cents"
        int total_price "cents"
    }
    sales {
        int id PK
        int company_id FK
        int user_id FK
        int quote_id FK "optional origin"
        text customer_name
        text status "pending|confirmed|in_progress|completed|cancelled"
        int subtotal "cents"
        int total "cents"
    }
    sale_items {
        int id PK
        int sale_id FK
        int product_id FK
        text product_name "snapshot"
        real quantity
        int unit_price "cents"
        int total_price "cents"
    }
    payment_methods {
        int id PK
        int company_id FK
        text name
        text type "cash|pix|credit_card|boleto|..."
        text details "JSON"
        bool active
    }
    transactions {
        int id PK
        int company_id FK
        int user_id FK
        int sale_id FK "optional"
        text description
        int amount "cents"
        text type "income|expense"
        text status "pending|paid|cancelled"
    }

    companies ||--o{ users : "primary company"
    companies ||--o{ user_companies : "multi-tenant"
    users ||--o{ user_companies : "belongs to"
    users ||--|| user_auth : "credentials"
    companies ||--o{ products : "owns"
    companies ||--o{ quotes : "owns"
    companies ||--o{ sales : "owns"
    companies ||--o{ payment_methods : "owns"
    companies ||--o{ transactions : "owns"
    users ||--o{ quotes : "creates"
    users ||--o{ sales : "creates"
    users ||--o{ transactions : "creates"
    quotes ||--o{ quote_items : "has"
    quotes ||--o{ sales : "originates"
    sales ||--o{ sale_items : "has"
    sales ||--o{ transactions : "generates"
    products ||--o{ quote_items : "referenced by"
    products ||--o{ sale_items : "referenced by"
```

---

## Full Application Data Flow

```mermaid
flowchart TD
    subgraph Browser["Browser (Nuxt Client)"]
        LOGIN["/login page"]
        DASH["/index — Dashboard"]
        EMPR["/empresas"]
        USR["/usuarios"]
        PROD["/produtos"]
        ORC["/orcamentos"]
        VEND["/vendas"]
        AUTH["useAuth composable\n(cookies: mc_user, mc_companies,\nmc_active_company)"]
    end

    subgraph Nuxt["Nuxt Server (H3 event handlers)"]
        direction TB
        MLOGIN["POST /api/auth/login"]
        MSALES["GET|POST /api/sales\n[id] GET|PUT|DELETE"]
        MTX["GET|POST /api/transactions\n[id] GET|PUT|DELETE"]
        MQUOTES["GET|POST /api/quotes\n[id] GET|PUT|DELETE"]
        MPRODS["GET|POST /api/products\n[id] GET|PUT|DELETE"]
        MCORP["GET|POST /api/companies\n[id] GET|PUT|DELETE"]
        MUSERS["GET|POST /api/users\n[id] GET|PUT|DELETE"]
        MPAY["GET|POST /api/payment-methods\n[id] PUT|DELETE"]
        MUC["GET|POST /api/user-companies\n[id] DELETE"]
        ZOD["Zod schema validation\n(server/utils/schemas.ts)"]
        DRIZZLE["Drizzle ORM\n(server/utils/db.ts)"]
    end

    subgraph DB ["libsql / SQLite"]
        COMPANIES[("companies")]
        USERS[("users")]
        USER_AUTH[("user_auth")]
        USER_CO[("user_companies")]
        PRODUCTS[("products")]
        QUOTES[("quotes + quote_items")]
        SALES[("sales + sale_items")]
        TRANSACTIONS[("transactions")]
        PAY_METHODS[("payment_methods")]
    end

    LOGIN -->|"POST email+password+hwid"| MLOGIN
    MLOGIN --> ZOD
    ZOD --> DRIZZLE
    DRIZZLE --> USER_AUTH
    DRIZZLE --> USERS
    DRIZZLE --> USER_CO
    MLOGIN -->|"user + companies[]"| AUTH

    DASH -->|"Promise.all useFetch x4"| MSALES & MTX & MQUOTES & MPRODS
    EMPR --> MCORP
    USR --> MUSERS
    PROD --> MPRODS
    ORC --> MQUOTES
    VEND --> MSALES

    MSALES --> ZOD --> DRIZZLE --> SALES
    MTX --> ZOD --> DRIZZLE --> TRANSACTIONS
    MQUOTES --> ZOD --> DRIZZLE --> QUOTES
    MPRODS --> ZOD --> DRIZZLE --> PRODUCTS
    MCORP --> ZOD --> DRIZZLE --> COMPANIES
    MUSERS --> ZOD --> DRIZZLE --> USERS
    MPAY --> ZOD --> DRIZZLE --> PAY_METHODS
    MUC --> ZOD --> DRIZZLE --> USER_CO

    AUTH -.->|"activeCompanyId filter\ninject into all requests"| MSALES & MTX & MQUOTES & MPRODS & MCORP & MUSERS
```

---

## Business Lifecycle: Quote → Sale → Transaction

```mermaid
stateDiagram-v2
    [*] --> QuoteDraft : User creates quote
    QuoteDraft --> QuoteSent : Send to customer
    QuoteSent --> QuoteApproved : Customer approves
    QuoteSent --> QuoteRejected : Customer rejects
    QuoteSent --> QuoteExpired : validUntil passed
    QuoteApproved --> SalePending : Convert to Sale (quote_id FK)

    SalePending --> SaleConfirmed : Confirm order
    SaleConfirmed --> SaleInProgress : Dispatch
    SaleInProgress --> SaleCompleted : Delivery done
    SalePending --> SaleCancelled : Cancel
    SaleConfirmed --> SaleCancelled : Cancel

    SaleCompleted --> TransactionPending : Auto-generate income transaction
    TransactionPending --> TransactionPaid : Mark as paid
    TransactionPending --> TransactionCancelled : Cancel
```

---

## Multi-Tenancy: User ↔ Company Access

```mermaid
flowchart LR
    subgraph CompanyA["Company A"]
        PA[products]
        QA[quotes]
        SA[sales]
        TA[transactions]
        MA[payment_methods]
    end
    subgraph CompanyB["Company B"]
        PB[products]
        QB[quotes]
        SB[sales]
        TB[transactions]
        MB[payment_methods]
    end

    USER["User (role: manager)"]
    UC1["user_companies\n(userId, companyA, role=admin)"]
    UC2["user_companies\n(userId, companyB, role=user)"]
    COOKIE["mc_active_company cookie\n→ used as companyId filter\non every API call"]

    USER --> UC1 --> CompanyA
    USER --> UC2 --> CompanyB
    COOKIE -. "scopes all queries" .-> CompanyA
    COOKIE -. "scopes all queries" .-> CompanyB
```

---

## Key Architectural Observations

### ✅ Strengths

- **Clean separation**: All data access goes through `db.ts` → Drizzle → libsql. No raw SQL elsewhere.
- **Zod at the boundary**: Every write route validates through `server/utils/schemas.ts` before touching the DB.
- **Product snapshots**: `quote_items` and `sale_items` store a snapshot of `product_name`, `fck`, `slump`, etc. at time of creation — correct approach for audit integrity if a product is later edited/deleted.
- **HWID device binding**: On first login, the device fingerprint is recorded in `user_auth.hwid` and enforced on subsequent logins.
- **Multi-tenant ready**: The `user_companies` junction table lets one user belong to multiple companies with different roles per company.
- **Secure Auth Middleware**: Global middleware enforces authentication on all `/api/` routes, protecting sensitive endpoints.
- **Strict Company Access**: `requireCompanyAccess` utility ensures users can only access data for companies they are explicitly authorized for, preventing horizontal privilege escalation.
- **Encrypted Sessions**: Server-side session management (H3) with signed/encrypted cookies prevents session tampering.

### ⚠️ Potential Issues

| # | Area | Issue |
|---|---|---|
| 1 | **No test suite** | No Vitest/Playwright setup detected. All business logic is untested. |
