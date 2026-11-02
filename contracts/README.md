# Recall Wallet Agent — Gated Payment Vault

Status: **BUILT, DEPLOYED, AND VERIFIED ON TESTNET (Nov 2, 2026).**
`build/vault.wasm` compiled cleanly and is deployed to
`recallwallet.testnet` (deploy tx
`DG262GLyJnekjjDHrWTnZfuWP5VpwMPpxEYFzigm5fND`); on-chain
verification passed (see `TESTNET_VERIFICATION.md`). The chat UI
(`app/index.html`) does not call this contract yet — UI integration
is the next step.

## What it is

`src/index.js` is a NEAR smart contract written in JavaScript with
`near-sdk-js` 2.0.0 (no Rust needed — Rust/cargo is not installed in
this environment). It holds testnet NEAR in the contract account and
only releases funds when the stored on-chain policy passes:

- per-transaction cap, daily cap, confirm threshold — all in yoctoNEAR
  (1 NEAR = 10^24 yoctoNEAR). There is NO USD conversion on-chain.
- allowlist of recipient NEAR accounts (non-allowlisted = blocked).
- daily spent tracking, resetting on a new UTC day (block timestamp).
- `request_payment(to, amount)` → ALLOWED (transfer executes now),
  BLOCKED (funds stay, exact rule named: `perTxCap`, `dailyCap`, or
  `allowlist`, plus an `insufficientBalance` safety guard), or
  NEEDS_CONFIRMATION (recorded pending, no transfer).
- `confirm_payment(id)` re-checks caps/allowlist/balance at execution
  time (the confirm threshold itself is not re-checked — the call IS
  the confirmation) and then transfers, or blocks with the rule named.
- remembered rules: `add_rule` / `remove_rule` / `get_rules`.
- decision log: every allowed/blocked/pending/confirmed payment is
  recorded on-chain, readable via `get_payments`.
- owner-only writes (owner = deploying account, set at `init`); anyone
  may fund the vault via payable `deposit()`, but only the owner can
  move funds out or change policy.

## Functions (15 exported)

Calls: `init`, `deposit`, `set_policy`, `add_to_allowlist`,
`remove_from_allowlist`, `add_rule`, `remove_rule`,
`request_payment`, `confirm_payment`.
Views: `get_policy`, `get_allowlist`, `get_rules`, `get_spent_today`,
`get_payments`, `get_balance`.

Return-type note: when a payment is ALLOWED, the method returns the
transfer promise itself, so the caller gets no JSON decision object
back in that case — the decision is already in the on-chain log.
BLOCKED and NEEDS_CONFIRMATION return plain JSON.

## Build

```sh
cd contracts
npm install   # see toolchain note below
npm run build # -> build/vault.wasm
node test-vault.mjs
```

`build/` is a build artifact (git-ignored, never pushed). To rebuild
from a clean checkout you need `npm install` inside `contracts/`
(the contract has its own package.json so the root app is untouched).

### Toolchain note (this environment, 2026-11-02)

`near-sdk-js` 2.0.0's postinstall downloads its compiler deps
(binaryen, QuickJS, wasi-sdk) from GitHub releases and extracts them
with plain `tar xvf`. On this machine that extraction fails with
`tar: Cannot change ownership to uid 1001, gid 127: Operation not
permitted` — the tarball's recorded ownership cannot be applied here,
even though the files themselves extract fine. Workaround used here:
install with `npm install --ignore-scripts`, then complete the
postinstall steps manually with `tar --no-same-owner` (binaryen,
QuickJS, wasi-sdk into `node_modules/near-sdk-js/lib/cli/deps/`).
If you reinstall from scratch and the build fails with a missing
`qjsc`/`wasi-sdk`/`binaryen` error, that is the cause — re-run the
manual extraction step; it is not a contract bug.

## What is NOT enforced on-chain (honesty)

- No USD pricing: callers convert off-chain and pass yoctoNEAR.
- No cross-chain settlement: the vault pays NEAR on NEAR testnet.
  Base/Ethereum legs remain Chain Signatures + Intents work.
- The contract cannot stop a payment that never goes through it: any
  agent that pays from an ordinary account bypasses the vault. The
  vault enforces policy only for funds it actually holds.
- Testnet only. Nothing here touches mainnet or real money.

## Verification

- Local (done, no chain): `node contracts/test-vault.mjs` — WASM
  magic bytes + all 15 exported methods, plus a plain-JS mirror of
  the policy logic (same check order, same BigInt math) covering
  allowed/blocked-perTx/blocked-daily/blocked-allowlist/
  needs-confirmation/confirm re-check/day rollover/insufficient
  balance. This proves the logic and the build, NOT on-chain behaviour.
- Testnet (not yet run): `TESTNET_VERIFICATION.md` — exact calls and
  expected results, including a blocked payment whose balances must
  not move by even 1 yocto.
