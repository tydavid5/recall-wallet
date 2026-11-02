// Recall Wallet Agent — Gated Payment Vault deployment script.
//
// *** DO NOT RUN WITHOUT THE OWNER'S EXPLICIT DEPLOY GO-AHEAD ***
// This script has NOT been run. It sends real (testnet) transactions:
// deploying a contract to recallwallet.testnet, initializing it, funding
// it, and configuring its policy. Testnet funds are worthless, but the
// account state change is real, so it waits for a deliberate go-ahead.
//
// What it does, in order:
//   1. Reads the testnet key from ../.testnet-key.json at runtime.
//      The key is NEVER printed, logged, or committed (git-ignored).
//   2. Deploys contracts/build/vault.wasm to recallwallet.testnet.
//   3. Calls init() with demo policy (yoctoNEAR, NOT USD):
//      per-tx cap 1 NEAR, daily cap 2 NEAR, confirm threshold 0.5 NEAR.
//   4. Adds recallwallet-freelancer.testnet to the allowlist.
//   5. Adds two remembered rules.
//   6. Funds the vault with 1 testnet NEAR via deposit().
//   7. Reads back get_policy, get_allowlist, get_rules, get_balance.
//
// Usage (only with go-ahead): node scripts/deploy-vault.mjs
// Requires: contracts/build/vault.wasm (built), ../.testnet-key.json.
import fs from "fs";
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  parseNearAmount,
} from "near-api-js";

const CONTRACT = "recallwallet.testnet";
const FREELANCER = "recallwallet-freelancer.testnet";
const RPC = "https://rpc.testnet.near.org";
const GAS = 100000000000000n; // 100 TGas

const keyFile = new URL("../.testnet-key.json", import.meta.url);
const { accountId, privateKey } = JSON.parse(fs.readFileSync(keyFile, "utf8"));
if (accountId !== CONTRACT) {
  throw new Error(`Key file is for ${accountId}, expected ${CONTRACT}; refusing to deploy.`);
}
const wasmPath = new URL("../contracts/build/vault.wasm", import.meta.url);
const code = fs.readFileSync(wasmPath);

const provider = new JsonRpcProvider({ url: RPC });
const signer = new KeyPairSigner(KeyPair.fromString(privateKey));
const account = new Account(accountId, provider, signer);

async function view(method, args = {}) {
  const res = await provider.query({
    request_type: "call_function",
    account_id: CONTRACT,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    finality: "final",
  });
  return JSON.parse(Buffer.from(res.result).toString());
}

console.log("Deploying vault to", CONTRACT, "…");
const deployOutcome = await account.deployContract(code);
console.log("Deploy tx:", deployOutcome?.transaction?.hash || deployOutcome?.transaction_outcome?.id);

console.log("Initializing policy (1 / 2 / 0.5 NEAR, yoctoNEAR on-chain) …");
await account.callFunction({
  contractId: CONTRACT,
  methodName: "init",
  args: {
    per_tx_cap: parseNearAmount("1"),
    daily_cap: parseNearAmount("2"),
    confirm_threshold: parseNearAmount("0.5"),
  },
  gas: GAS,
});

console.log("Allowlisting freelancer …");
await account.callFunction({
  contractId: CONTRACT,
  methodName: "add_to_allowlist",
  args: { account_id: FREELANCER },
  gas: GAS,
});

for (const rule of ["Never spend more than the daily cap.", "Never pay a brand-new address without asking first."]) {
  console.log("Adding rule:", rule);
  await account.callFunction({
    contractId: CONTRACT,
    methodName: "add_rule",
    args: { rule },
    gas: GAS,
  });
}

console.log("Funding vault with 1 testnet NEAR …");
await account.callFunction({
  contractId: CONTRACT,
  methodName: "deposit",
  args: {},
  gas: GAS,
  deposit: parseNearAmount("1"),
});

console.log("Policy:", await view("get_policy"));
console.log("Allowlist:", await view("get_allowlist"));
console.log("Rules:", await view("get_rules"));
console.log("Balance:", await view("get_balance"));
console.log("Explorer: https://explorer.testnet.near.org/accounts/" + CONTRACT);
console.log("Next: run contracts/TESTNET_VERIFICATION.md against this deployment.");
