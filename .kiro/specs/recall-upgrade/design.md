# Recall Wallet Upgrade — Design

## Scope

This design covers the three areas defined in requirements.md:
- **Area 1** — Headless NEAR Intents Dry-Quote (R-1 to R-7)
- **Area 2** — Demo Gaps (R-8 to R-9)
- **Area 3** — Polish (R-10 to R-16)

---

## Architecture overview

```
Browser (app/index.html)
  └─ Intents panel
       └─ Dry Quote sub-section
            ├─ user edits amount (default 1 wNEAR)
            ├─ "Get quote" button (disabled during request)
            └─ fetch() → https://1click.chaindefuser.com/v0/quote  (direct, no proxy)
                           ↓ 200 JSON
                       amountOutFormatted, timeEstimate → DOM
                       amber "Dry quote — no money moves, no commitment." label always visible

Node.js (scripts/intents-quote.mjs)
  └─ POST https://1click.chaindefuser.com/v0/quote  (dry: true)
       body includes: deadline (ISO 8601, >= 2 min from now)
       → prints amountOutFormatted + timeEstimate on success
       → exits 0 on success, 1 on HTTP error

app/server.js — UNCHANGED (R-6)
```

No new dependencies. No proxy. No API key. No signing.

---

## 1Click request body — exact specification

Used by both `scripts/intents-quote.mjs` and the browser panel fetch.

```json
{
  "dry": true,
  "swapType": "EXACT_INPUT",
  "slippageTolerance": 100,
  "originAsset": "nep141:wrap.near",
  "destinationAsset": "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  "amount": "1000000000000000000000000",
  "depositType": "INTENTS",
  "refundTo": "recallwallet.testnet",
  "refundType": "INTENTS",
  "recipient": "recallwallet.testnet",
  "recipientType": "INTENTS",
  "deadline": "<ISO 8601 — computed at call time, now + 5 minutes>"
}
```

| Field | Value | Reason |
|---|---|---|
| `dry` | `true` | Free preview, no commitment (R-1, R-3, R-5) |
| `originAsset` | `nep141:wrap.near` | wNEAR on NEAR, 24 decimals (R-2) |
| `destinationAsset` | `nep141:1720862...` | USDC on NEAR, 6 decimals (R-2) |
| `amount` | `"1000000000000000000000000"` | 1 wNEAR = 1×10²⁴ yoctoNEAR |
| `depositType` | `"INTENTS"` | Source token is on NEAR, deposit path is through Intents (R-2) |
| `refundTo` | `"recallwallet.testnet"` | NEAR account refunds go to (R-2) |
| `refundType` | `"INTENTS"` | Required; without it the API returns HTTP 400 (verified live Nov 10, 2026) |
| `recipient` | `"recallwallet.testnet"` | NEAR account the quote is for; required, must be a string (verified live Nov 10, 2026) |
| `recipientType` | `"INTENTS"` | Recipient is a NEAR account (R-2) |
| `deadline` | ISO 8601, >= now + 2 min | Required; without it the API returns HTTP 400 (R-1) |

The browser panel converts the user-editable decimal wNEAR input to a
24-decimal yoctoNEAR integer string before POSTing.
