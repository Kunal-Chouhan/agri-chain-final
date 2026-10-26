# AgriChain - Blockchain-Based Supply Chain Transparency for Agricultural Produce

Express 5 + MongoDB (Mongoose 9) + JWT backend, a dependency-free HTML/CSS/JS single-page frontend (Bricolage Grotesque + IBM Plex via Google Fonts, with system fallbacks), and a Solidity contract that anchors a tamper-evident hash chain of every supply-chain event.

## How it works
1. **Farmer** creates a batch -> `BATCH_CREATED` event.
2. Custodian initiates a transfer to an allowed role (Farmer→Transporter→Warehouse/Distributor→Retailer); the receiver **confirms** or **rejects**. Each step is an `Event`.
3. Every event is canonicalised, hashed with keccak256 and linked to the previous event's hash (`prevHash`), per batch.
4. The hash is anchored on-chain (optional) by `SupplyChainLedger`; the contract itself rejects a broken chain.
5. Anyone can open **Track** with a batch ID: `GET /api/verify/:batchId` recomputes all hashes, so edits made directly in MongoDB are detected.

Rules live in one place: `services/policy.js` (roles, stages, transfer routes). Atomic `findOneAndUpdate` guards prevent double confirmation and races.

## Quick demo (2 commands)
```bash
npm install
cp .env.example .env     # MONGO_URI must point to a running MongoDB; set JWT_SECRET
npm run demo             # loads the demo dataset, then starts http://localhost:5000
```
`npm run seed:demo` is safe to re-run; it replaces the earlier demo data. It creates 15 users, 28 batches and ~170 chained events, including a rejected handover, a recalled batch and one deliberately tampered batch.

| Try this | What you see |
|---|---|
| Home page, "Intact record" | `BATCH-DEMO-001`: all hashes verify |
| "Edited record" | `BATCH-DEMO-005`: quantity was edited in the database, so the chain shows as altered |
| "Recalled batch" | `BATCH-DEMO-028`: on hold with a reason |
| Sign in (button on the login page fills it in) | farmer1, transporter1, warehouse1, distributor1, retailer1, inspector1 `@agrichain.local`, password `Demo@1234`; admin `admin@agrichain.local` / `ChangeMe@123` |

### Demo API key
```
agri_demo_7f3a9c2e51b84d60a1e9
curl -H "x-api-key: agri_demo_7f3a9c2e51b84d60a1e9" http://localhost:5000/api/v1/batches?stage=AT_RETAILER
```
Read-only, 120 requests/minute. It is a public demo credential: revoke it in **Admin → API keys** before any real deployment, and issue your own keys there (stored hashed, shown once).

## Run it
```bash
npm install
cp .env.example .env          # set MONGO_URI and JWT_SECRET
npm run seed:admin            # creates the first ADMIN
npm run dev                   # http://localhost:5000
```

### Optional: blockchain anchoring
```bash
npm run chain:node            # terminal 1 - local Hardhat chain, prints test accounts + private keys
npm run chain:deploy          # terminal 2 - prints CONTRACT_ADDRESS
```
Put `RPC_URL`, `PRIVATE_KEY` (the deployer account, i.e. the first one) and `CONTRACT_ADDRESS` in `.env`, restart. Without them the app works and events stay `PENDING`. `npm run retry:anchors` anchors any pending/failed events in order.

## API
| Method | Route | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| POST | /api/batches | FARMER |
| GET | /api/batches/mine, /incoming, /:batchId | logged in (timeline only for people involved) |
| POST | /api/batches/:id/transfer `{receiverId, price?}` | current custodian |
| POST | /api/batches/:id/confirm, /reject | designated receiver |
| GET | /api/users/receivers | logged in |
| GET/POST | /api/admin/users | ADMIN |
| PATCH | /api/admin/users/:id/status, /api/admin/batches/:batchId/hold | ADMIN |
| GET | /api/verify/:batchId | public (also served as page at `/verify/:batchId`, handy for QR codes) |
| GET | /api/stats | public |
| POST | /api/batches/:id/quality `{grade, moisturePct?, temperatureC?, notes?}` | INSPECTOR |
| GET | /api/v1/stats, /api/v1/batches, /api/v1/batches/:batchId | `x-api-key` |
| GET | /api/admin/overview, /api/admin/batches?q= | ADMIN |
| GET/POST/PATCH | /api/admin/apikeys | ADMIN |

## Ideas for next
Mark batch `SOLD` at retailer, printable QR label per batch (the `/verify/:id` link is ready), split/merge batches, IPFS certificates, automated tests.
