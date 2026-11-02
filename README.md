# Recall Wallet — an agent wallet with a memory and a conscience

Built for NEAR HACKATHON (Nov 1–14, 2026). Tracks: Agent Economy, AI Security & Defense,
Autonomous Business, Unstoppable DeFi.

## The idea in one line

AI agents should be able to spend money, but only what you told them they could —
and they should remember why.

You talk to Recall Wallet in plain language. It remembers your spending rules
across sessions, checks every payment against those rules, and pays across
chains from a single NEAR account.

## Demo script (3 acts, ~2 minutes)

1. **Set a rule:** "Never spend more than $100 a day, never pay a brand-new
   address without asking me first."
2. **A payment that passes:** "Send 20 USDC to my freelancer on Base."
   It is checked against policy and shown ready to execute. (The live
   Intents dry quote is attempted by `scripts/intents-quote.mjs`, but
   that API was down on 2026-11-02 — see the honesty note below. The
   demo does not claim a quote it did not get.)
3. **A payment that gets blocked:** "Send 500 USDC to this random address."
   It is refused, and the refusal names the exact rule that stopped it.
   In a fresh session, the agent still remembers the rule.

## What is real, and what is not (honesty note for judges)

- **Real, runnable today, no funds needed:**
  - The policy engine (`app/policy.js`) — pure logic, tested by running it.
  - The memory store (`app/memory.js`) — rules persist across sessions.
  - NEAR testnet account `recallwallet.testnet` — created Nov 2, 2026 via
    the testnet faucet, holding 10 testnet NEAR (testnet only, worthless).
  - Chain Signatures address derivation (`scripts/derive-addresses.mjs`)
    — verified twice, identical before and after account creation:
    Ethereum (path `ethereum-1`): `0x2818ED85AF9d0981c8e8932eeA58DEaCe937147D`;
    Base (path `base-1`): `0xe36E0eC8ADB83fABD273d23f4ed26bD7Ee197354`.
    Derived via testnet MPC contract `v1.signer-prod.testnet`, no private
    key used or created.
- **Live, but currently unavailable:** the NEAR Intents dry quote
  (`scripts/intents-quote.mjs`) — live pricing from the 1Click API with
  `dry: true`, free, no commitment, no funds. As of Nov 2, 2026, 14:46 WAT,
  `1click.chaindefuser.com` returns HTTP 521 (host down) on both the quote
  and token endpoints. The script is ready and will be re-tested; until it
  succeeds, the demo does not claim a live quote.
- **Mainnet-only, by NEAR's own design:** the Intents settlement stack has
  no public testnet deployment; `intents.near` is mainnet-only. So this
  prototype does **not** fake a settlement transaction hash on testnet.
  A live mainnet execution with a tiny amount is an optional stretch goal,
  only with the owner's explicit go-ahead and funding — it is not required
  for the demo, and nothing in the demo pretends otherwise.
- **Testnet only by default.** No real money moves in the default demo path.

## Run it

Requires Node 20+. Install dependencies first:

```bash
npm install
```

```bash
# Policy engine + memory demo (no keys, no funds)
node app/demo.js

# Chat UI (no keys, no funds, no build step)
node app/server.js   # then open http://localhost:8000

# Chain Signatures address derivation (read-only, no keys, no funds)
node scripts/derive-addresses.mjs recallwallet.testnet

# Live Intents dry quote (no keys, no funds, dry: true only)
# NOTE: 1click.chaindefuser.com returned HTTP 521 on 2026-11-02 — retry
# later; the script fails loudly instead of faking a quote.
node scripts/intents-quote.mjs

# Testnet execution proof (needs local .testnet-key.json, git-ignored;
# testnet only, worthless funds — do NOT commit the key)
node scripts/testnet-execution-proof.mjs
```

## Testnet execution proof (verified 2026-11-02)

After policy approved a $20 payment to the freelancer, the agent executed
0.01 testnet NEAR from `recallwallet.testnet` to
`recallwallet-freelancer.testnet`:

- Tx hash: `LjE4Sn8ZTKkYnbQqwurHmvuBnAEK2uizCjhpuDPzuAs`
- Explorer: https://explorer.testnet.near.org/transactions/LjE4Sn8ZTKkYnbQqwurHmvuBnAEK2uizCjhpuDPzuAs
- Balances after (via testnet RPC): sender 9.989955… NEAR, recipient
  exactly 10.01 NEAR — the transfer landed, minus a tiny gas fee.
- This is a testnet execution proof, NOT a USDC payment on Base (see the
  honesty note above).

## Structure

- `app/policy.js` — spending rules: daily cap, per-transaction cap,
  address allowlist, confirm-above-threshold, and refusal reasons.
- `app/memory.js` — persistent rule/preference memory across sessions.
- `app/demo.js` — the 3-act demo in the terminal.
- `scripts/intents-quote.mjs` — live NEAR Intents 1Click dry quote.
- `scripts/derive-addresses.mjs` — Chain Signatures address derivation.
- `scripts/testnet-execution-proof.mjs` — testnet execution proof.
- `contracts/` — empty. A NEAR smart contract for on-chain policy +
  memory is a deferred stretch goal (Rust is not installed here), not
  part of the working demo — the JS policy + memory is the core.
- `docs/PLAN.md` — 12-day build plan, risks, and decisions.
- `docs/DEMO_SCRIPT.md` — timed 2-minute demo video script.
- `docs/DEMO_POST.md` — ready-to-post X demo post draft + submission
  checklist (post only after the repo is public).
- `SECURITY.md` — what is public vs secret, how to rotate a leaked
  key, and the full pre-publish audit (2026-11-02).
- `scripts/security-check.mjs` — run before every publish; fails on
  key literals, tokens, a missing `.gitignore` entry, or a server
  traversal regression. It prints file names only, never secrets.
- `scripts/rotate-testnet-key.mjs` — rotate the testnet key on-chain
  (add new key, delete old, rewrite key file with 0600 permissions).

## How judges can verify in 2 minutes

1. `npm install && node app/demo.js` — policy passes, blocks, and
   asks for confirmation, each naming its rule.
2. `node app/server.js`, open http://localhost:8000 — same checks in
   the chat UI, plus "remember: …" persisting across reloads.
3. `node scripts/derive-addresses.mjs recallwallet.testnet` — the
   Ethereum and Base addresses in this README, derived live.
4. Open the explorer link in "Testnet execution proof" below and
   confirm the transfer landed.

## Submission

- Public repository: https://github.com/tydavid5/recall-wallet
  (published 2026-11-02, branch `main`)
- Demo post on X: tag @NEARProtocol and #NEARHackathon, with video or
  screenshots, before Nov 14, 2026, 23:59 UTC. Draft in
  `docs/DEMO_POST.md` — post only from the owner's X account, with the
  video or screenshots attached.
- Both links submitted through the hackathon form.
