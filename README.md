# Stellar Invoice Financing Marketplace (InvoiceFlow)

InvoiceFlow is a decentralized invoice financing DApp powered by **Soroban Smart Contracts**, **Next.js 15**, and **StellarWalletsKit**. 

This DApp enables businesses to list unpaid invoices at a discount to unlock immediate working capital. Investors purchase these invoices and collect the full face value upon maturity when the borrower repays the debt.

---

## 🔗 Project Links

* **GitHub Repository**: [mathsphile/invoiceFlow](https://github.com/mathsphile/invoiceFlow)
* **Live Demo**: [InvoiceFlow Production App](https://invoice-flow-indol.vercel.app/)
* **Demo Video**: [InvoiceFlow Walkthrough (YouTube)](https://youtu.be/demo-video-placeholder)

---

## 📸 Screenshots & Proof of Architecture

### 1. Landing Portal
*InvoiceFlow landing interface displaying marketplace volumes, interactive stats, and wallet connectivity.*
![Landing Portal](public/screenshots/landing_page.png)

### 2. Dashboard & Platform Analytics
*User dashboard displaying active invoice listings, trustline configurations, faucet claims, and historical transactions.*
![Dashboard Analytics](public/screenshots/dashboard.png)

### 3. Stellar Expert Explorer
*On-chain verification showing smart contract interaction trace and SAC token transfer confirmations.*
![Stellar Explorer](public/screenshots/explorer.png)

### 4. Mobile Responsive UI
*Fully responsive interface optimized for mobile layout (resizing cards, stackable grids, and responsive sidebar navigation).*
![Mobile Responsive UI] ![alt text](image.png)
![alt text](image-1.png)

### 5. CI/CD Integration pipeline
*GitHub Actions workflow verifying smart contract checks, linter validations, typescript type-checks, and production bundle builds.*
![CI/CD Pipeline](public/screenshots/ci_cd_pipeline.png)


---

## ⛓ Deployed Addresses (Stellar Testnet)

* **Marketplace Contract Address**: `CAA4MCQBTFRBCQFXVHK62UTICZRA4MM2YKRO3XOJ774LHK4IBYDO43HZ` (referred to as `CONTRACT_ADDRESS_HERE` in config)
* **USD Token Address (SAC Wrapper)**: `CDPTVB7HUN3DU3Q7JKKIDCVC2DMZ7SFLMJYD4AKB6EJ2LI2JUHRF2RJ6`
* **Deployer Address**: `GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY`
* **Example Contract Deployment Tx**: `a73c763213a7c231384c244a7d983a81eb8b7f3fa131b61d2e07e9061cb31b1f` (referred to as `TRANSACTION_HASH_HERE` in config)
* **Explorer Link**: [Stellar Expert Explorer](https://stellar.expert/explorer/testnet/tx/a73c763213a7c231384c244a7d983a81eb8b7f3fa131b61d2e07e9061cb31b1f)

---

## 🔑 Authentication Architecture

InvoiceFlow uses **Stellar Wallet Addresses (Wallet ID)** as the primary key for authentication and login.

```
[Stellar Wallet]
  ( Freighter / Albedo )
       │
       ▼  (kit.getPublicKey())
 [Stellar Address]  ──► (Primary Key)
       │
       ▼  (Zustand store: login())
 [isLoggedIn: true]
       │
       ├─► LocalStorage Sync (persists session)
       ▼
 [AuthGuard Component]
       │
       ├─► Authenticated: Render Page (/dashboard, /marketplace, etc.)
       └─► Unauthenticated: Render "Access Denied" Portal
```

1. **Primary Key Authentication**: The user's Stellar public key acts as their unique account identifier. The DApp does not require traditional email/password credentials.
2. **Session Persistence**: Once connected, the user clicks "Log In". The session status is saved to `localStorage` under `invoiceflow_logged_in: true` and managed globally via a Zustand state store (`hooks/useWalletStore.ts`).
3. **Auth Guards**: Protected client-side pages (`/dashboard`, `/marketplace`, `/activity`, `/history`) are wrapped in an `AuthGuard` component. If the session is inactive, they are redirected to a lockscreen prompting authentication.
4. **Log Out**: Clicking "Log Out" clears both Zustand store memory and `localStorage` session keys.

---

## 📜 Soroban Smart Contract Specifications

### File Location: `contracts/invoice_marketplace/src/lib.rs`

### 1. Data Structures & Types
The contract stores state entries using Soroban's persistent storage.

```rust
// Storage Keys
pub enum DataKey {
    Admin,           // Instance storage: address of contract admin
    Token,           // Instance storage: address of the payment token (USD SAC)
    InvoiceCount,    // Instance storage: total number of invoices listed
    Invoice(u64),    // Persistent storage: mapped by invoice ID
}

// Invoice Struct
pub struct Invoice {
    pub id: u64,              // Unique invoice identifier
    pub borrower: Address,    // Account that submitted the invoice
    pub investor: Option<Address>, // Account that funded the invoice
    pub amount: i128,         // Face value of the invoice
    pub discount_price: i128, // Amount the investor pays to fund it
    pub due_date: u64,        // Unix timestamp in seconds for maturity
    pub status: u32,          // 0 = Submitted, 1 = Funded, 2 = Repaid
    pub description: String,  // Metadata (invoice description or hash)
}
```

### 2. Contract Interfaces (Functions)

#### `initialize(env: Env, admin: Address, token: Address)`
Sets up the marketplace contract. Can only be invoked once.
* Parameters:
  * `admin`: Public key of the marketplace operator.
  * `token`: Address of the payment token contract.

#### `submit_invoice(env: Env, borrower: Address, amount: i128, discount_price: i128, duration: u64, description: String) -> u64`
Allows a borrower to register a new invoice. Returns the generated invoice ID.
* Authorization: `borrower` must authenticate.
* Emits Event: `(symbol_short!("submit"), invoice_id, borrower)` payload: `(amount, discount_price, due_date)`.

#### `fund_invoice(env: Env, investor: Address, invoice_id: u64)`
Allows an investor to fund a listed invoice.
* Authorization: `investor` must authenticate.
* Transfers `discount_price` tokens from `investor` to the invoice `borrower`.
* Emits Event: `(symbol_short!("fund"), invoice_id, investor)` payload: `discount_price`.

#### `repay_invoice(env: Env, payer: Address, invoice_id: u64)`
Allows the borrower (or any payer) to repay the invoice debt.
* Authorization: `payer` must authenticate.
* Transfers the full `amount` (face value) from `payer` to the invoice `investor`.
* Emits Event: `(symbol_short!("repay"), invoice_id, payer)` payload: `amount`.

---

## 🚀 User Proof of Concept (PoC) Walkthrough

Follow this step-by-step test scenario to experience the DApp's core lifecycle on the Stellar Testnet. The DApp includes an **Interactive Onboarding (User PoC)** checklist on the Dashboard that tracks your progress in real-time.

```
       AUTHENTICATE             ADD TRUSTLINE             CLAIM MINT
┌────────────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│ 1. Connect wallet      │─►│ 2. Register USD   │─►│ 3. Request 1000    │
│    and sign in session │  │    Stellar Asset  │  │    mock USD tokens │
└────────────────────────┘  └───────────────────┘  └────────────────────┘
                                                             │
                                                             ▼
         REPAY DEBT               FUND INVOICE             LIST ASSET
┌────────────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│ 6. Settle full amount  │◄─│ 5. Invest in a    │◄─│ 4. Submit invoice   │
│    upon maturity       │  │    listing        │  │    at a discount   │
└────────────────────────┘  └───────────────────┘  └────────────────────┘
```

### Step 1: Wallet Authentication
1. Install [Freighter Wallet](https://www.freighter.app/) extension and switch network to **Testnet**.
2. Go to the InvoiceFlow landing page (`http://localhost:3000`).
3. Click **Log In with Wallet ID**. Approve the connection in Freighter.
4. Once authenticated, your session is established, and you are redirected to the **Dashboard**.

### Step 2: Establish USD Trustline
1. Before your address can hold or transfer the marketplace's wrapped USD token, you must establish a Stellar Trustline.
2. In the Dashboard Faucet panel, click **Add USD Trustline**.
3. Confirm the transaction in Freighter. This executes a classic Stellar `changeTrust` operation.

### Step 3: Claim Faucet funding
1. In the Dashboard, click **Request 1,000 USD**.
2. The server-side faucet API (`/api/mint`) will submit a payment transaction from the deployer account directly to your wallet address.
3. Your **Marketplace Balance** will update in the top right showing `1000.00 USD`.

### Step 4: Submit a Test Invoice
1. Go to the **Marketplace** page.
2. Under "List New Invoice", fill out the form:
   * **Face Value**: `500` (The total amount you owe on maturity)
   * **Discount Price**: `450` (The price you are willing to sell the invoice for today)
   * **Duration**: `30 Days`
   * **Description**: `Invoice #101`
3. Click **List Invoice** and sign the transaction in Freighter.
4. Verify that:
   * A new listing appears in the "Active Listings" board.
   * The invoice appears in your "Borrower Console" with a status of **Submitted**.
   * An event appears in the **Activity Feed** logging the submission.

### Step 5: Fund an Invoice
1. (Optional for testing) Switch to a different Freighter account, fund it via Friendbot, log in, create a trustline, and request faucet USD.
2. Find the invoice in the "Active Listings" board.
3. Click **Fund**. Confirm the transaction in Freighter.
4. Verify that:
   * The investor's USD balance decreases by `450` (discount price).
   * The borrower's USD balance increases by `450`.
   * The invoice status changes to **Funded**.

### Step 6: Settle & Repay
1. As the borrower (in your original account), go to the **Borrower Console** in the Marketplace.
2. You will see your invoice status is now **Funded**.
3. To settle the debt, click **Repay Debt** and sign the transaction in Freighter.
4. Verify that:
   * The borrower transfers the full face value (`500` USD) to the investor.
   * The invoice status changes to **Repaid**.
   * The investment cycle completes with the investor earning a yield of `50` USD (principal `450` repaid as `500`).

---

## 🛠 Setup & Run Instructions

### Prerequisites
* [Node.js](https://nodejs.org) (v18+)
* [Rust & Cargo](https://rustup.rs/)
* [Stellar CLI](https://developers.stellar.org/docs/tools/cli)

### 1. Install Dependencies
```bash
git clone <repository_url> invoicemarketplace
cd invoicemarketplace
npm install
```

### 2. Compile & Test Smart Contract
```bash
cd contracts/invoice_marketplace
cargo test
```

### 3. Run Locally
Start the Next.js development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
