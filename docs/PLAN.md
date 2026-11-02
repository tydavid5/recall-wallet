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
- [ ] Days 4–5 (deferred, not blocking): NEAR smart contract for on-chain
      policy + memory. Rust is not installed in this environment, so this
      is a stretch goal — the JS policy + memory demo is the working
      core, and the README says so.
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
