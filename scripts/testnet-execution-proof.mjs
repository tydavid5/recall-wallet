// Recall Wallet Agent — testnet execution proof (testnet only, worthless funds).
//
// HONESTY NOTE: this is NOT a USDC payment on Base. NEAR Intents settlement
// is mainnet-only, and the 1Click quote API was returning HTTP 521 on
// 2026-11-02. What this script proves, on-chain, is the other half of the
// demo: once policy APPROVES a payment, the agent can actually execute a
// transfer from recallwallet.testnet, and the transaction is verifiable on
// the testnet explorer. The cross-chain USDC leg is represented in the
// chat demo by the policy check + derived Base address + (when the API
// recovers) a live dry quote — never by a faked hash.
//
// Usage: node scripts/testnet-execution-proof.mjs
// Requires .testnet-key.json (local only, git-ignored, never committed).
import fs from "fs";
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  parseNearAmount,
} from "near-api-js";
import { createPolicy } from "../app/policy.js";

const keyFile = new URL("../.testnet-key.json", import.meta.url);
const { accountId, privateKey } = JSON.parse(fs.readFileSync(keyFile, "utf8"));

// Step 1 — policy check for the hypothetical payment the agent approved:
// $20 to the freelancer, who is allowlisted, under the $100 daily cap.
const policy = createPolicy({
  dailyCapUsd: 100,
  perTxCapUsd: 100,
  confirmAboveUsd: 50,
  allowlist: ["0xe36E0eC8ADB83fABD273d23f4ed26bD7Ee197354"],
});
const check = policy.check({
  amountUsd: 20,
  toAddress: "0xe36E0eC8ADB83fABD273d23f4ed26bD7Ee197354",
  spentTodayUsd: 0,
});
console.log("Policy check for $20 payment to freelancer:", check);
if (check.decision !== "ALLOWED") {
  console.log("Policy did not approve — no transfer executed.");
  process.exit(0);
}

// Step 2 — execute a tiny TESTNET transfer as the on-chain proof.
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.near.org" });
const signer = new KeyPairSigner(KeyPair.fromString(privateKey));
const account = new Account(accountId, provider, signer);
const outcome = await account.transfer({
  receiverId: "recallwallet-freelancer.testnet",
  amount: parseNearAmount("0.01"),
});
const hash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id;
console.log("Testnet transfer executed:");
console.log(" from:", accountId);
console.log(" to: recallwallet-freelancer.testnet");
console.log(" amount: 0.01 testnet NEAR");
console.log(" tx hash:", hash);
console.log(" explorer: https://explorer.testnet.near.org/transactions/" + hash);
