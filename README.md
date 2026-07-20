# Stellar Equipment Rental Marketplace DApp

A decentralized, trustless equipment rental marketplace built on the Stellar network using Soroban WebAssembly smart contracts, Next.js 15, and Tailwind CSS.

---

## Overview

The **Stellar Equipment Rental DApp** is a secure marketplace that facilitates peer-to-peer asset rentals (such as industrial tools, construction machines, and scaffolding towers) directly on the Stellar blockchain. 

The application removes the need for trusted third-party rental agencies. Instead, contract-driven escrows manage rental payouts and security deposits. Rented assets require a daily rental fee and a security deposit. When items are returned, the owner resolves the agreement, collecting the daily rental payout and refunding the collateral deposit (minus any fees claimed for lateness or damages).

---

## Features

1. **Multi-Wallet Integration:** Supported wallets include **Freighter**, **xBull**, and **Albedo** utilizing `StellarWalletsKit`.
2. **Escrow Contract Security:** All rental rates and collateral security deposits are safely escrowed directly inside the smart contract during the rental period.
3. **Dynamic Inspect & Resolve Flow:** Owners inspect returned equipment and submit claims against the deposit in case of damage or late returns, refunding the remainder to the renter.
4. **Real-Time Polling & Sync:** Automatic 5-second background polling via TanStack Query syncs user balances, item availability, and rental state changes instantly.
5. **On-Chain Activity Feed:** Dynamic stream of contract logs (Listed, Rented, Returned, Resolved events) fetched directly from the Soroban RPC event filter.
6. **Transaction Logs:** Keeps track of recently submitted transactions in the session, showcasing pending, success, and failure states with links to the Explorer.

---

## Tech Stack

*   **Frontend:** Next.js 15 (App Router), React, TypeScript
*   **Styling:** Tailwind CSS (Dark-Mode & Developer Aesthetics)
*   **State Management:** Zustand
*   **Blockchain Integration:** `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk`
*   **Data Fetching & Polling:** TanStack React Query (v5)
*   **Smart Contracts:** Soroban SDK (Rust compiled to Wasm)

---

## Setup Instructions

### Prerequisites
*   Node.js (v18+ or v20+)
*   Rust toolchain (with `wasm32-unknown-unknown` target installed)
*   Stellar CLI installed (provided locally as `stellar.exe`)

---

## Environment Variables

Create a `.env.local` file in the root directory and define the following variables:

```env
NEXT_PUBLIC_CONTRACT_ID=CONTRACT_ADDRESS_HERE
NEXT_PUBLIC_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

*Note: For testing, the token address represents the native Testnet XLM contract (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`).*

---

## Wallet Setup

1. Install the [Freighter Wallet browser extension](https://www.freighter.app/).
2. Open Freighter, navigate to **Settings** -> **Preferences**, and switch the active network to **Testnet**.
3. Fund your public key on Stellar Testnet by pasting it into the [Stellar Friendbot Faucet](https://laboratory.stellar.org/#account-creator?network=testnet) to receive 10,000 testnet XLM.

---

## Contract Deployment

Follow these steps to compile and deploy the Rust contract to Stellar Testnet:

1. **Build the WASM binary:**
   ```bash
   npm run contract:build
   ```
   This compiles the contract and saves the optimized `rental.wasm` file in `contracts/rental/target/wasm32v1-none/release/`.

2. **Deploy to Testnet:**
   ```bash
   node scripts/deploy.js
   ```
   This script:
   - Configures/funds a deployer account.
   - Deploys `rental.wasm` to Stellar Testnet.
   - Initialises the contract with the native payment token.
   - Generates TypeScript client bindings.
   - Automatically writes the contract ID and variables to `.env.local` and `lib/config.json`.

3. **Seed Starter Items:**
   ```bash
   node scripts/seed.js
   ```
   Adds 3 mock equipment listings (Excavator, Cement Mixer, Scaffolding Tower) to populate your local marketplace view immediately.

---

## Running Locally

Once deployed and seeded, launch the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment (Vercel)

To deploy your DApp to Vercel:
1. Push your code to a GitHub repository.
2. Link the repository to your Vercel Dashboard.
3. Configure the environment variables on Vercel:
   - `NEXT_PUBLIC_CONTRACT_ID`: `CONTRACT_ADDRESS_HERE`
   - `NEXT_PUBLIC_TOKEN_ADDRESS`: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
   - `NEXT_PUBLIC_NETWORK`: `testnet`
   - `NEXT_PUBLIC_RPC_URL`: `https://soroban-testnet.stellar.org`
   - `NEXT_PUBLIC_NETWORK_PASSPHRASE`: `Test SDF Network ; September 2015`
4. Deploy.

---

## Technical Details

### Deployed Testnet Contract ID
```text
CONTRACT_ADDRESS_HERE
```
*Actual Deployed ID:* `CCHUJCA3OCXFTF3K2O5S2GCQYXSEZDKNBEWLVO4YFIY2VT6HMCOMHCJH`

### Example Transaction Hash
```text
TRANSACTION_HASH_HERE
```
*Sample Successful Tx Hash:* `f252bf656a84efdfb880ffc626eb39b8bc73dbffca36336e9ff9d638ba4df289`
