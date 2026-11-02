// Recall Wallet Agent — vault testnet verification runner.
// Follows contracts/TESTNET_VERIFICATION.md steps 1-7, 9, 10.
// Step 8 (non-owner call) is NOT run here: no second account key is on file.
// NOTE on balances: the vault account pays gas for its own calls, so its
// balance drops by gas on every call. "No transfer" is therefore checked
// as: freelancer balance unchanged to the yocto, and vault balance down
// only by gas (far less than the blocked amount), never by the transfer.
// Testnet only, worthless funds. Run only with the owner's go-ahead.
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
const GAS = 100000000000000n;

const keyFile = new URL("../.testnet-key.json", import.meta.url);
const { accountId, privateKey } = JSON.parse(fs.readFileSync(keyFile, "utf8"));
if (accountId !== CONTRACT) throw new Error("Key file mismatch; refusing.");
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
async function acctBalance(id) {
  const res = await provider.query({ request_type: "view_account", account_id: id, finality: "final" });
  return BigInt(res.amount);
}
async function call(method, args) {
  const out = await account.callFunction({ contractId: CONTRACT, methodName: method, args, gas: GAS });
  return out;
}
function near(y) { const s = y.toString().padStart(25, "0"); return s.slice(0, -24) + "." + s.slice(-24).replace(/0+$/, "") || "0"; }
async function lastPayment() {
  const pays = await view("get_payments");
  return pays[pays.length - 1];
}
function show(label, p) { console.log(label, JSON.stringify(p)); }

console.log("Starting balances — vault:", near(await acctBalance(CONTRACT)), "freelancer:", near(await acctBalance(FREELANCER)));

console.log("\n[1] request 0.2 NEAR to freelancer (expect ALLOWED)");
await call("request_payment", { to: FREELANCER, amount: parseNearAmount("0.2") });
show("  payment:", await lastPayment());
console.log("  spent_today:", JSON.stringify(await view("get_spent_today")));

console.log("\n[2] request 1.2 NEAR (expect BLOCKED perTxCap)");
await call("request_payment", { to: FREELANCER, amount: parseNearAmount("1.2") });
show("  payment:", await lastPayment());

console.log("\n[3] request 0.7 NEAR (expect NEEDS_CONFIRMATION, no transfer)");
const spentBefore = await view("get_spent_today");
await call("request_payment", { to: FREELANCER, amount: parseNearAmount("0.7") });
const pending = await lastPayment();
show("  payment:", pending);
console.log("  spent unchanged:", JSON.stringify(await view("get_spent_today")) === JSON.stringify(spentBefore));

console.log("\n[4] confirm pending payment id", pending.id);
await call("confirm_payment", { id: pending.id });
show("  payment:", (await view("get_payments")).find((p) => p.id === pending.id));
console.log("  spent_today now:", JSON.stringify(await view("get_spent_today")));

console.log("\n[5] request 0.4 NEAR (expect ALLOWED, spent -> 1.3)");
await call("request_payment", { to: FREELANCER, amount: parseNearAmount("0.4") });
show("  payment:", await lastPayment());
console.log("  spent_today:", JSON.stringify(await view("get_spent_today")));

console.log("\n[6] request 0.8 NEAR (expect BLOCKED dailyCap: 1.3 + 0.8 > 2)");
await call("request_payment", { to: FREELANCER, amount: parseNearAmount("0.8") });
show("  payment:", await lastPayment());

console.log("\n[7] CRITICAL blocked check: 0.1 NEAR to some-random.testnet");
const v0 = await acctBalance(CONTRACT);
const f0 = await acctBalance(FREELANCER);
await call("request_payment", { to: "some-random.testnet", amount: parseNearAmount("0.1") });
show("  payment:", await lastPayment());
const v1 = await acctBalance(CONTRACT);
const f1 = await acctBalance(FREELANCER);
console.log("  freelancer unchanged to the yocto:", f1 === f0, `(delta ${f1 - f0})`);
console.log("  vault delta (gas only, must be << 0.1 NEAR):", near(v0 - v1), "NEAR");

console.log("\n[9] Memory: add 'never pay on weekends', then remove it");
await call("add_rule", { rule: "never pay on weekends" });
let rules = await view("get_rules");
console.log("  rules after add:", rules);
const idx = rules.indexOf("never pay on weekends");
await call("remove_rule", { index: idx });
console.log("  rules after remove:", await view("get_rules"));

console.log("\n[10] Final read-back");
console.log("  payments:", JSON.stringify(await view("get_payments"), null, 1));
console.log("  spent_today:", JSON.stringify(await view("get_spent_today")));
console.log("  final balances — vault:", near(await acctBalance(CONTRACT)), "freelancer:", near(await acctBalance(FREELANCER)));
console.log("Explorer:", "https://explorer.testnet.near.org/accounts/" + CONTRACT);
