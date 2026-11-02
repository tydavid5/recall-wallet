# Security

Read this before publishing, forking, or running the demo on a machine
other than your own.

## What is public, and what is secret

**Public — safe to publish, and already in the README:**
- NEAR account IDs (`recallwallet.testnet`, `recallwallet-freelancer.testnet`)
- Chain Signatures derived addresses (Ethereum, Base) — these are
  *public addresses*, not keys. Publishing an address does not give
  anyone control of it.
- Transaction hashes and explorer links — public by design.
- NEAR public keys — public by design.

**Secret — never publish, never paste into a README, issue, or chat:**
- The NEAR private key in `.testnet-key.json`. It lives only on the
  machine that runs the testnet demo, is listed in `.gitignore`, and
  has 0600 file permissions.
- Any mainnet key, seed phrase, or API token. This project has none,
  and the demo must never be pointed at mainnet with a real key pasted
  into code.

## Why Chain Signatures change the usual leak

In a normal multichain demo, a leaked key file means every chain is
compromised. Here, the foreign-chain keys never exist as files at all:
the NEAR MPC network (`v1.signer-prod.testnet` on testnet) holds the
key shares, and addresses are derived from the NEAR account + path.
The only key a builder can leak is the NEAR account key itself — which
is why that one file gets all the protection above.

## Before every publish, run

```bash
node scripts/security-check.mjs
```

It fails (naming the file, never the secret) if a key-shaped literal,
token, or mnemonic appears in any publishable file, if
`.testnet-key.json` is missing from `.gitignore`, or if the demo
server's path lock-down regresses.

## If a key leaks

1. Stop using it immediately. Do not "clean" the commit and keep the
   key — a leaked key is compromised even after the file is deleted,
   because git history and forks keep it.
2. Rotate it: `node scripts/rotate-testnet-key.mjs` adds a new
   full-access key, deletes the old one on-chain, and rewrites
   `.testnet-key.json` with 0600 permissions. (This was done on
   2026-11-02 after a scan printed the old testnet key into a tool
   log; the old key's delete transaction is on testnet, and the new
   key was verified by a fresh testnet transfer.)
3. If it was ever a mainnet key, move the funds to a fresh account
   first — rotation alone does not recover stolen funds.

## Other issues checked on 2026-11-02

- **Demo server path traversal (fixed):** `app/server.js` used to join
  `req.url` straight into a file path, so `/../.testnet-key.json`
  could have been served. It now serves only `index.html` from its
  own directory and returns 404 for everything else, including
  encoded traversal attempts — verified with live requests.
- **Chat UI injection:** `app/index.html` renders messages with
  `textContent`, never `innerHTML`, and uses no `eval`.
- **Intents quote script:** posts only to the known 1Click API, with
  `dry: true`, no auth token, no keys.
- **Derivation script:** read-only, takes only an account ID, creates
  no keys.
- **Dependencies:** `chainsig.js` and `near-api-js` from the public
  npm registry; no credentials in `package-lock.json`.
- **Testnet only by default:** no mainnet keys, no real money, no
  faked transaction hashes anywhere in the repo.
