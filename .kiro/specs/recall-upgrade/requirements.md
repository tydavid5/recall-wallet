# Recall Wallet Upgrade — Requirements

Hackathon deadline: **Nov 14, 2026, 23:59 UTC**

Hard constraints that apply to every requirement below:
- Testnet and dry-quote only. No mainnet transactions. No real money moves.
- `.testnet-key.json` is never read, copied, quoted, or referenced by any new code.
- Vault policy stays fixed: per-tx 1 NEAR, daily 2 NEAR, confirm 0.5 NEAR, allowlist `recallwallet-freelancer.testnet`.
- Every quote, balance, or demo value shown to users must carry an honest label (see R-10 to R-12).

---

## Area 1 — Headless NEAR Intents Dry-Quote

### R-1 (script: correct body fields)
`scripts/intents-quote.mjs` MUST add the required `deadline` field (ISO 8601, at
least 2 minutes in the future) to its POST body before sending to
`https://1click.chaindefuser.com/v0/quote`. Without `deadline`, the
endpoint returns HTTP 400 "deadline must be a valid ISO 8601 date
string". Adding this field produces a 200 with a live quote.

Testable: `node scripts/intents-quote.mjs` exits 0 and prints
`amountOut` and `timeEstimate` values when the API is reachable.

### R-2 (script: correct asset identifiers)
The script MUST use asset identifiers confirmed from the live
`/v0/tokens` endpoint:
- **wNEAR (source):** `nep141:wrap.near` (24 decimals)
- **USDC on NEAR (destination):** `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` (6 decimals)

The old destination asset string
(`nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`)
was already correct. The `depositType` and `recipientType` MUST be
`"INTENTS"` (not `"ORIGIN_CHAIN"`) when the source is wNEAR on NEAR itself
and the recipient is a NEAR account.

Testable: the printed `amountOutFormatted` for 1 wNEAR is a decimal
USD-plausible number (e.g. ≈3.55 as of 2026-11-10 at $3.56/NEAR) and
`amountOut` is a 6-decimal integer string (USDC has 6 decimals).

### R-3 (script: honest output)
Every line the script prints MUST include at least one of these labels:
`"dry quote"`, `"no funds moved"`, or `"dry: true"`. The script MUST
NOT print text that could be read as a real swap transaction hash.

Testable: grep the output of `node scripts/intents-quote.mjs` for one
of those label strings; must match.

### R-4 (script: failure path)
If the API returns a non-200 status, the script MUST print the HTTP
status, the response body (up to 300 chars), and an explicit note that
it has not faked a quote, then exit non-zero. It MUST NOT print a
placeholder quote or suppress the error.

Testable: mock the URL to return 500 (or temporarily break the
deadline to get 400) and confirm the script prints an error and exits 1.

### R-5 (in-app dry-quote panel)
`app/index.html` MUST add a "Dry Quote" sub-section inside the existing
Intents panel (or as a new panel tab) that calls the 1Click
`/v0/quote` endpoint client-side (browser `fetch`) with `dry: true` and
displays the live result without navigating away from the page.

The panel MUST show, at minimum:
- Amount in (editable; default 1 wNEAR)
- Asset pair (wNEAR → USDC on NEAR, labelled)
- `amountOutFormatted` from the response
- `timeEstimate` from the response
- An "honest label" strip (see R-10)
- A "Get quote" button that is disabled while a request is in flight

Testable: open the app, navigate to Intents panel, click "Get quote";
within 5 s a formatted USDC amount appears. With devtools network tab
open, exactly one POST to `1click.chaindefuser.com` is visible per
button press; it has `dry: true` in the request body.

### R-6 (in-app: no CORS workaround via proxy)
The client-side quote call MUST go directly to
`https://1click.chaindefuser.com`; no proxy, no server relay, no
key in the request. The existing `app/server.js` MUST NOT be changed
to relay requests.

Testable: `app/server.js` diff is empty (server file unchanged) and
the network request in devtools shows the destination host as
`1click.chaindefuser.com`.

### R-7 (in-app: error display)
If the fetch fails (network error or non-200), the panel MUST display
a human-readable error message in place of the quote. The error MUST
NOT be swallowed silently.

Testable: throttle the network to offline in devtools; click "Get
quote"; an error message (not an empty box) appears within the timeout.

---

## Area 2 — Demo Gaps

### R-8 (Play Demo includes Intents panel)
The automated `playDemo()` sequence in `app/index.html` MUST navigate
to the Intents panel and trigger a dry quote as one of its acts, so
that the demo video can capture it without manual intervention.

Testable: press "▶ Play demo"; the UI visibly switches to the Intents
panel, the "Get quote" button is clicked by the cursor animation, and
a quote result appears on screen.

### R-9 (demo script updated)
`docs/DEMO_SCRIPT.md` MUST add a Shot that shows the Intents dry quote
on screen (the new panel from R-5). The shot MUST state:
- It is a dry quote (no money moves)
- The API endpoint used
- The displayed USDC amount

The script MUST remove or update the line "the 1Click quote API was
returning HTTP 521 on 2026-11-02", replacing it with current status.

Testable: `docs/DEMO_SCRIPT.md` contains the words "dry quote" and
"1click.chaindefuser.com" and no longer references "HTTP 521".

---

## Area 3 — Polish

### R-10 (honest-label rule: dry-quote panel)
Every quote result shown in the app MUST be accompanied by a visible
label such as: "Dry quote — no money moves, no commitment." The label
MUST be rendered in a distinct colour (amber `#f59e0b` or muted text)
so it is not confused with execution output.

Testable: DOM inspection of the quote result container shows a child
element with class `warn` or similar containing the words "Dry quote".

### R-11 (honest-label rule: demo balances)
The Wallet panel heading copy currently says "Balances below are testnet
only and worthless." The word "worthless" is accurate but tonally harsh
for judges scanning the UI. It MUST be updated to "testnet-only demo
balances — no real value" (or equivalent phrasing that keeps the
honest intent while reading as deliberate, not accidental).

Testable: `app/index.html` does not contain the string "worthless" in
UI-visible text.

### R-12 (navfoot stale copy)
The `.navfoot` element in the sidebar still reads "the 1Click quote API
returned HTTP 521 on 2026-11-02". Since the API is now up, this MUST be
updated to reference the new live status (e.g. "NEAR Intents dry quote:
live as of Nov 2026").

Testable: `app/index.html` does not contain the string "HTTP 521".

### R-13 (README: Intents section updated)
`README.md` MUST update the "Intents, any chain" bullet to note that:
- The 1Click dry-quote API is reachable as of Nov 10, 2026
- The correct `deadline` field is now sent
- The app shows a live quote in the Intents panel

The old disclaimer "HTTP 521 (host down)" MUST be removed or struck through
in context. The honesty note block MUST be updated to reflect live status.

Testable: `README.md` does not contain the string "HTTP 521" after the
update.

### R-14 (README: structure stale)
`README.md` still lists `contracts/` as "BUILT, NOT YET DEPLOYED" in
the Structure section even though the contract has been deployed and
verified. The Structure entry MUST reflect deployed status.

Testable: the Structure section in `README.md` does not contain "NOT
YET DEPLOYED" after the update.

### R-15 (security-check coverage)
`scripts/security-check.mjs` MUST NOT reject `deadline` ISO-8601 date
strings as "token-shaped" literals. If the script currently flags
timestamps, add an exemption for well-formed ISO 8601 strings.

Testable: `node scripts/security-check.mjs` exits 0 after all changes
are applied.

### R-16 (submission checklist)
`docs/DEMO_POST.md` MUST mark the two unchecked checklist items as
completed (`- [x]`) once the repo is public and both links are submitted.
Until then, they remain unchecked but the post body MUST be updated to
mention the live dry-quote panel.

Testable: the post body in `docs/DEMO_POST.md` contains the words "dry
quote" after the update.
