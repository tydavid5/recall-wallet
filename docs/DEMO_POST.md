# Recall Wallet Agent — demo post draft for X

The repository is public (link in the post below). Before posting,
attach the demo video (or screenshots).

---

Built for NEAR HACKATHON: Recall Wallet Agent — an agent wallet with a memory
and a conscience.

Agents are about to spend money for us. Recall Wallet Agent remembers your
spending rules across sessions, checks every payment against them, and
only then pays — from one NEAR account, across chains via Chain
Signatures + NEAR Intents.

Demo: a $20 payment to an allowlisted freelancer passes. A $500 payment
to a random address is blocked — and it tells you exactly which rule
stopped it. On testnet, the approved execution is real and verifiable:
https://explorer.testnet.near.org/transactions/LjE4Sn8ZTKkYnbQqwurHmvuBnAEK2uizCjhpuDPzuAs

Repo: https://github.com/tydavid5/recall-wallet

@NEARProtocol #NEARHackathon

---

Update before posting (added 2026-11-02 — post body above unchanged):
since this draft was written, the Gated Payment Vault was deployed and
verified on testnet (policy per-tx 1 NEAR / daily 2 NEAR / confirm 0.5
NEAR, 6 on-chain payment records) and the app's Intents panel now
pre-loads Aurora's Intents Swap Widget, so users can fund from any
supported chain without bridging. If you want the post to reflect that,
add a line like: "Since drafting this, the vault is live on testnet
and the app now funds from any chain via Intents — policy enforced
on-chain, not just in the demo."

---

Submission checklist (nearhackathon.com):
- [ ] Repository is public, README matches what actually runs
- [ ] Demo post is public, says it was built at NEAR HACKATHON, tags
      @NEARProtocol and #NEARHackathon, video or screenshots attached
- [ ] Both links sent through the hackathon form before
      Nov 14, 2026, 23:59 UTC
- [ ] Tracks selected: Agent Economy, AI Security & Defense,
      Autonomous Business, DeFi
