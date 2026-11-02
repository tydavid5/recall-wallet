// Recall Wallet Agent — live NEAR Intents 1Click dry quote.
// dry: true = free preview, no commitment, no funds, no keys.
// This is the honest demo path: Intents settlement is mainnet-only
// (intents.near has no public testnet deployment), so we show live
// pricing and gate it behind policy — we never fake a settlement hash.
const res = await fetch("https://1click.chaindefuser.com/v0/quote", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: "nep141:wrap.near",
    destinationAsset:
      "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", // USDC on NEAR
    amount: "1000000000000000000000000", // 1 wNEAR
    depositType: "ORIGIN_CHAIN",
    refundTo: "recallwallet.testnet",
    recipientType: "DESTINATION_CHAIN",
  }),
});
if (!res.ok) {
  const body = await res.text();
  console.error("Quote failed:", res.status, body.slice(0, 200));
  console.error("Note: 1click.chaindefuser.com returned 521 (host down) on 2026-11-02 — retry later, do not fake a quote.");
  process.exit(1);
}
const quote = await res.json();
console.log("Live Intents dry quote (1 wNEAR -> USDC on NEAR):");
console.log(" amountOut:", quote.quote?.amountOutFormatted ?? quote.quote?.amountOut);
console.log(" amountOut USD:", quote.quote?.amountOutUsd);
console.log(" timeEstimate:", quote.quote?.timeEstimate, "seconds");
console.log(" (dry quote only — no funds moved, no settlement executed)");
