// Recall Wallet Agent — live NEAR Intents 1Click dry quote.
// dry: true = free preview, no commitment, no funds, no keys.
// This is the honest demo path: Intents settlement is mainnet-only
// (intents.near has no public testnet deployment), so we show live
// pricing and gate it behind policy — we never fake a settlement hash.
const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();
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
    depositType: "INTENTS",
    refundTo: "recallwallet.testnet",
    refundType: "INTENTS",
    recipient: "recallwallet.testnet",
    recipientType: "INTENTS",
    deadline,
  }),
});
if (!res.ok) {
  const body = await res.text();
  console.error("Dry quote failed:", res.status, body.slice(0, 300));
  console.error("No quote was faked — dry quote only, no funds moved. Retry later.");
  process.exit(1);
}
const quote = await res.json();
console.log("Dry quote — live Intents 1Click quote, 1 wNEAR -> USDC on NEAR (dry: true, no funds moved):");
console.log(" amountOut (dry quote):", quote.quote?.amountOutFormatted ?? quote.quote?.amountOut);
console.log(" amountOut USD (dry quote):", quote.quote?.amountOutUsd);
console.log(" timeEstimate seconds (dry quote):", quote.quote?.timeEstimate);
console.log(" (dry quote only — no funds moved, no settlement executed)");
