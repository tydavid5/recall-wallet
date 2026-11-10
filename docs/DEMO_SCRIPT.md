# Recall Wallet Agent — demo video script (2 minutes, 3 acts)

Record this against the chat UI (`node app/server.js`, then
http://localhost:8000) and the terminal. No voiceover is required —
on-screen captions carry it. Do not add music over the key lines.

## Shot 0 — title (0:00–0:10)
On screen: "Recall Wallet Agent — an agent wallet with a memory and a conscience.
Built for NEAR HACKATHON."
Say: "Agents are about to spend money on our behalf. Who stops them
spending it wrong? This one remembers the rules you gave it."

## Shot 1 — one account, every chain (0:10–0:35)
Terminal: `node scripts/derive-addresses.mjs recallwallet.testnet`
Show the Ethereum and Base addresses appearing from the one NEAR account.
Say: "One NEAR account, `recallwallet.testnet`. Chain Signatures derive
its Ethereum and Base addresses — no new private keys, no new wallets."

## Shot 2 — a payment that passes (0:35–1:05)
Chat UI: type "send $20 to my freelancer on Base".
Show: ALLOWED, "Passes all spending rules."
Say: "Twenty dollars to my freelancer, who is allowlisted and under my
$100 daily cap. It passes — and only then would it go to Intents."

## Shot 3 — a payment that gets blocked (1:05–1:35)
Chat UI: type "send $500 to 0xRandomAddress".
Show: BLOCKED, naming the per-transaction cap and the allowlist.
Say: "Five hundred dollars to a random address. It doesn't just fail —
it tells me exactly which rule stopped it. That's the whole point."

## Shot 4 — live Intents dry quote (1:35–1:50)
App: the Play Demo button navigates to the Intents panel and clicks
"Get quote" automatically.
Show: the Dry Quote section with the result — e.g. "1 wNEAR → 3.549296
USDC on NEAR · about 12 s · dry quote, no money moved."
Say: "The Intents panel fetches a live dry quote from the NEAR Intents
1Click API (`https://1click.chaindefuser.com/v0/quote`). It is a dry
quote — `dry: true` in the request body. No money moves, no wallet
needed, no commitment. That USDC number is a real live price, not a
placeholder."

## Shot 5 — it remembers, and it really executed (1:50–2:10)
Chat UI: type "remember: never pay on weekends" — then reload the page
and show the rule is still there.
Terminal: show the testnet explorer link for
`LjE4Sn8ZTKkYnbQqwurHmvuBnAEK2uizCjhpuDPzuAs`
(0.01 testnet NEAR, `recallwallet.testnet` →
`recallwallet-freelancer.testnet`, recipient balance exactly 10.01).
Say: "It remembers across sessions. And when policy approves, it really
executes — on testnet, verifiable on the explorer. Testnet only, no real
money, no faked hashes."

## What NOT to say on camera
- Do not say the USDC-on-Base payment itself settled. It did not —
  Intents settlement is mainnet-only. The dry quote in Shot 4 is exactly
  that: a dry price check only, no settlement, no deposit.
- Do not call the 0.01 testnet NEAR transfer a USDC payment. Call it
  what it is: a testnet execution proof.
