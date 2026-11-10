# Recall Wallet Upgrade — Tasks

Hackathon deadline: **Nov 14, 2026, 23:59 UTC**

Source of truth: `requirements.md` (R-1 to R-16) and `design.md` in this directory.
Hard rules: testnet and dry-quote only; no real money; no faked tx hashes; never read, copy, quote, or publish `.testnet-key.json`; vault policy fixed (per-tx 1 NEAR, daily 2 NEAR, confirm 0.5 NEAR, allowlist `recallwallet-freelancer.testnet`).

## Area 1 — Headless NEAR Intents Dry-Quote

- [x] 1.1 Fix `scripts/intents-quote.mjs`: add `deadline` (now + 5 min, ISO 8601), set `depositType` and `recipientType` to `INTENTS`, fix the failure message (R-1, R-2, R-3, R-4). Live fix found during verification Nov 10: the API also requires `refundType: "INTENTS"` and `recipient: "recallwallet.testnet"` — both added to the script, the panel, and `design.md`.
- [x] 1.2 Run `node scripts/intents-quote.mjs` and confirm a live `amountOut` and `timeEstimate` print (R-1, R-2). Verified Nov 10 ~22:35 WAT: 1 wNEAR → 3.549296 USDC, timeEstimate 12s, exit 0.
- [x] 1.3 Add the Dry Quote panel to `app/index.html` inside the Intents panel: amount in (default 1 wNEAR), pair labels, `amountOutFormatted`, `timeEstimate`, amber honest-label strip, Get quote button disabled while in flight (R-5, R-10)
- [x] 1.4 Confirm the panel fetch goes directly to `https://1click.chaindefuser.com` with `dry: true`, no proxy, no key, and `app/server.js` unchanged (R-6)
- [x] 1.5 Confirm the panel shows a human-readable error on failure instead of swallowing it (R-7)
- [x] 1.6 Run `node --check` on touched JavaScript and `node scripts/security-check.mjs` (R-15). Inline script passes `node --check`; security check exit 0.

## Area 2 — Demo Gaps

- [x] 2.1 `playDemo()` in `app/index.html` navigates to the Intents panel and triggers a dry quote as one of its acts (R-8). Verified Nov 10 ~22:40 WAT: Act 4 navigates to Intents, clicks Get quote, calls getDryQuote(), waits 2.8s.
- [x] 2.2 Update `docs/DEMO_SCRIPT.md` with a shot showing the Intents dry quote, and remove the "HTTP 521" line (R-9). Verified: Shot 4 added (1:35–1:50), no "HTTP 521" remains.

## Area 3 — Polish

- [x] 3.1 Update the Wallet panel heading copy, remove the word "worthless" from UI-visible text (R-11). Verified: now "testnet-only demo balances — no real value."
- [x] 3.2 Update the `.navfoot` copy to the live Intents status, remove "HTTP 521" (R-12). Verified: now "NEAR Intents dry quote: live as of Nov 2026 (1Click API reachable, dry: true, no settlement faked)."
- [x] 3.3 Update `README.md`: Intents section (live dry-quote status, deadline field) and Structure section (vault is deployed, not "NOT YET DEPLOYED"), remove "HTTP 521" (R-13, R-14). Verified: "Live and reachable as of Nov 10, 2026", "Built, deployed, and verified on testnet (Nov 2, 2026)".
- [x] 3.4 Update `docs/DEMO_POST.md` to mention the live dry-quote panel (R-16). Verified: post body mentions the dry quote; checklist items left unchecked.
- [x] 3.5 Re-run `node scripts/security-check.mjs` and confirm exit 0 after all changes (R-15). Verified Nov 10 ~22:40 WAT: exit 0, inline JS passes node --check.
