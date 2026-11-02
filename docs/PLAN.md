# Recall Wallet Agent — build plan (Nov 2–14, 2026)

Deadline: Nov 14, 2026, 23:59 UTC. Judging Nov 16–18. Prizes: $250K total,
$55K grand prize, $10K per track first place (13 tracks).

## Key constraint discovered Nov 2

NEAR Intents settlement is **mainnet-only**: `intents.near` has no public
testnet deployment, and the 1Click API's `dry: true` quote is the free,
no-commitment path. Consequence for this build:

- Default demo = policy + memory (real, testnet) + live dry quote (real
  pricing, no settlement). No faked tx hashes, ever.
- Optional stretch = one tiny mainnet Intents execution, only with the
  owner's explicit funding go-ahead. It is a nice-to-have, not the demo.

Chain Signatures, by contrast, DO have a testnet MPC contract:
`v1.signer-prod.testnet` (mainnet: `v1.signer`). Address derivation is
deterministic from NEAR account + derivation path, and needs no funds.

## Milestones

- [x] Day 1 (Nov 2): research, repo scaffold, policy engine, memory store,
      live Intents dry quote script.
- [x] Days 2–3: NEAR testnet account (faucet), Chain Signatures address
      derivation for EVM, verified in the terminal — plus a second
      account `recallwallet-freelancer.testnet` as the demo recipient.
- [x] Chat UI (web, zero build step) + testnet execution proof with a
      real, explorer-verifiable tx hash (see README).
- [x] Days 4–5 (unblocked 2026-11-02): Gated Payment Vault BUILT, NOT
      DEPLOYED. JS contract via `near-sdk-js` 2.0.0 (Rust still not
      installed — not needed). See `contracts/README.md`.
- [ ] Days 4–5 follow-up (needs owner deploy go-ahead): deploy vault
      to `recallwallet.testnet` (`scripts/deploy-vault.mjs`, NOT RUN),
      run `contracts/TESTNET_VERIFICATION.md`, then wire the chat UI
      to read policy/decisions from the contract.

## Gated Payment Vault (design, contracts/)

Target: `recallwallet.testnet` on NEAR
testnet; demo recipient `recallwallet-freelancer.testnet`. DEPLOYED
Nov 2, 2026 (deploy tx
`DG262GLyJnekjjDHrWTnZfuWP5VpwMPpxEYFzigm5fND`) and verified
on-chain by `scripts/verify-vault-testnet.mjs` (see
`contracts/TESTNET_VERIFICATION.md`).

- Holds testnet NEAR in the contract balance; releases funds only
  when on-chain policy passes. Blocked = no transfer, exact rule
  named (`perTxCap`, `dailyCap`, `allowlist`, plus an
  `insufficientBalance` safety guard). Above the confirm threshold =
  recorded pending, no transfer, until `confirm_payment(id)`
  re-checks caps/allowlist/balance and then transfers.
- Policy amounts are yoctoNEAR, not USD. There is no on-chain USD
  conversion, oracle, or price feed; callers convert off-chain.
- Daily spent resets on a new UTC day (block timestamp / ns-per-day).
- Owner-only writes (owner = deployer, set at `init`); anyone may
  fund via payable `deposit()`, only the owner can move funds out.
- Remembered rules (`add_rule`/`remove_rule`/`get_rules`) + a
  decision log (`get_payments`) + views (`get_policy`,
  `get_allowlist`, `get_spent_today`, `get_balance`).
- Return-type caveat: an ALLOWED payment returns the transfer promise
  itself, so its JSON decision lives in the on-chain log, not in the
  call result. BLOCKED / NEEDS_CONFIRMATION return plain JSON.
- NOT enforced: USD pricing, cross-chain settlement, or payments that
  never pass through the vault (an agent paying from an ordinary
  account bypasses it — the vault gates only funds it holds).
- Build: `cd contracts && npm install && npm run build` →
  `build/vault.wasm` (git-ignored artifact). Toolchain quirk: the
  SDK postinstall's plain `tar xvf` fails on ownership in this
  environment; see `contracts/README.md` for the `--no-same-owner`
  workaround.
- Verification: local mirror + artifact checks pass
  (`node contracts/test-vault.mjs`). On-chain proof awaits
  deployment + `contracts/TESTNET_VERIFICATION.md` — including a
  blocked payment whose balances must not move by 1 yocto.
- [ ] Days 9–10: demo video (2 min, 3 acts), README finalised, full
      end-to-end walkthrough from a clean checkout, exactly as judges
      will run it.
- [ ] Days 11–12: buffer, publish repo (owner go-ahead), post demo on X
      (@NEARProtocol, #NEARHackathon), submit both links via the form.

## Decisions needed from the owner

1. Tiny mainnet Intents execution for a real settlement hash? (default: NO
   — dry quote only, no real money). If yes, owner funds a small amount
   and approves the exact amount/asset/chain first.
2. NEAR testnet account name for the demo (e.g. `recallwallet.testnet`
   or similar, if available).
3. Publish the repo to GitHub under which account/org? (needs go-ahead
   before any push — the repo is local-only until then).

## Risks

- Intents mainnet-only: mitigated by the honest dry-quote demo above.
- Chain Signatures MPC signing on testnet can be slow/finicky: mitigate
  by making address derivation (read-only, deterministic) the headline,
  and a signed testnet message the stretch.
- 12 days, solo: scope is deliberately a terminal demo first, web UI
  second. If time runs short, cut the web UI, never the honest README.
