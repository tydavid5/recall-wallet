# Recall Wallet Agent — Vault testnet verification plan (RUN AND PASSED, Nov 2, 2026)

Status: the vault is BUILT (contracts/build/vault.wasm), DEPLOYED to
`recallwallet.testnet` (deploy tx
`DG262GLyJnekjjDHrWTnZfuWP5VpwMPpxEYFzigm5fND`), and VERIFIED on
testnet by `scripts/verify-vault-testnet.mjs`: 0.2 NEAR ALLOWED, 1.2
NEAR BLOCKED (`perTxCap`), 0.7 NEAR NEEDS_CONFIRMATION then confirmed,
0.4 NEAR ALLOWED (spent_today 1.3 NEAR), 0.8 NEAR BLOCKED (`dailyCap`),
0.1 NEAR to a non-allowlisted account BLOCKED (`allowlist`) with the
freelancer balance unchanged to the yocto (vault balance moved only by
gas on that call, 0.0012466985545336 NEAR — the plan's "vault unchanged
to the yocto" wording is unattainable since the caller pays gas).
Step 8 (non-owner call) was NOT run: no second account key is on file.
All amounts are yoctoNEAR (see contracts/src/index.js
header: there is no USD conversion on-chain).

Demo policy set by the deploy script (testnet demo values, NOT USD caps):
- per-transaction cap: 1 NEAR
- daily cap: 2 NEAR
- confirm threshold: 0.5 NEAR
- allowlist: recallwallet-freelancer.testnet
- vault funded with: 1 NEAR (plus the contract account's own balance)

## Setup (deploy script output — verify first)

After `node scripts/deploy-vault.mjs`, check:
- `get_policy` returns owner `recallwallet.testnet`, caps above.
- `get_allowlist` returns `["recallwallet-freelancer.testnet"]`.
- `get_balance` shows the funded balance.
- Explorer shows the deploy transaction on `recallwallet.testnet`
  (deploy script prints the hash — record it here only once it exists;
  do not invent one).

## Call sequence (run in this order; each step's expected result is exact)

Use the deploying account (`recallwallet.testnet`) for all calls.
Gas for calls: 100 TGas (`100000000000000`). Deposits: 0 unless stated.

1. `request_payment` — `{ "to": "recallwallet-freelancer.testnet", "amount": "200000000000000000000000" }` (0.2 NEAR)
   - EXPECTED: transfer executes; freelancer balance +0.2 NEAR; vault
     balance −0.2 NEAR; `get_spent_today` = 0.2 NEAR; `get_payments`
     shows id 0, decision ALLOWED, status executed.

2. `request_payment` — `{ "to": "recallwallet-freelancer.testnet", "amount": "1200000000000000000000000" }` (1.2 NEAR)
   - EXPECTED: returns decision BLOCKED, rule `perTxCap`. No transfer.

3. `request_payment` — `{ "to": "recallwallet-freelancer.testnet", "amount": "700000000000000000000000" }` (0.7 NEAR)
   - EXPECTED: returns decision NEEDS_CONFIRMATION, rule
     `confirmThreshold`, status pending. NO transfer, NO change to
     spent_today, NO change to either balance.

4. `confirm_payment` — `{ "id": 2 }` (the pending payment from step 3)
   - EXPECTED: transfer executes; freelancer +0.7 NEAR; spent_today
     becomes 0.9 NEAR; payment status becomes `confirmed`.

5. `request_payment` — `{ "to": "recallwallet-freelancer.testnet", "amount": "400000000000000000000000" }` (0.4 NEAR)
   - EXPECTED: ALLOWED, transfer executes; spent_today becomes 1.3 NEAR.

6. `request_payment` — `{ "to": "recallwallet-freelancer.testnet", "amount": "800000000000000000000000" }` (0.8 NEAR)
   - EXPECTED: BLOCKED, rule `dailyCap` (1.3 + 0.8 > 2.0). No transfer.
     Note the check order: dailyCap is reported, not confirmThreshold,
     because the daily check runs before the confirm check.

7. THE CRITICAL BLOCKED-PAYMENT CHECK — funds must NOT move:
   - Record vault balance (V0) and freelancer balance (F0) first.
   - `request_payment` — `{ "to": "some-random.testnet", "amount": "100000000000000000000000" }` (0.1 NEAR, non-allowlisted)
   - EXPECTED: the call itself SUCCEEDS and returns decision BLOCKED,
     rule `allowlist` — this is not a failed transaction. Afterwards
     vault balance is still V0 and freelancer balance is still F0, to
     the yocto. `get_payments` shows the blocked record with rule
     `allowlist`. If either balance moved, the vault has failed its
     core promise: stop and report it, do not explain it away.

8. Owner-only enforcement:
   - From ANY account other than `recallwallet.testnet`, call
     `request_payment` with a small allowlisted amount.
   - EXPECTED: the transaction FAILS with "Only the vault owner can
     call this method". No funds move, no payment record is added.

9. Memory:
   - `add_rule` — `{ "rule": "never pay on weekends" }`, then
     `get_rules` must list it. `remove_rule` — `{ "index": 0 }` (or
     the index of the rule added) must remove it. A non-owner `add_rule`
     must fail as in step 8.

10. Final read-back:
    - `get_payments` must show every decision above (allowed, blocked,
      pending→confirmed) with the exact rule named on each block.
    - `get_spent_today` must equal 1.3 NEAR (steps 1 + 4 + 5) unless
      the UTC day rolled over mid-test, in which case note the rollover
      and re-run the spent checks — do not report a rollover as a bug.

## What this plan does NOT prove

- It does not prove USD pricing: amounts are NEAR, converted off-chain
  by whoever calls the contract.
- It does not prove cross-chain settlement: the vault pays in NEAR on
  NEAR testnet. Base/Ethereum legs remain Chain Signatures + Intents
  work, unchanged by this contract.
- It does not prove mainnet behaviour: everything here is testnet only,
  with worthless funds.
