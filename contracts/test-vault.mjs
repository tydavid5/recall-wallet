// Recall Wallet Agent — vault verification WITHOUT a chain.
//
// WHY A MIRROR, STATED PLAINLY:
// near-sdk-js 2.x ships no mocked-context unit-test harness; its own
// README recommends near-workspaces, which needs a sandbox node binary
// and was not set up here. So this script does two honest things:
//   (1) checks the compiled artifact is a real WASM module exporting
//       exactly the 15 methods the contract defines, and
//   (2) re-implements the contract's policy decision logic in plain JS
//       (same check order, same BigInt yocto math, same day rollover)
//       and runs it against the cases the testnet plan will run on-chain.
// It proves the DECISION LOGIC and the BUILD. It does NOT prove the
// on-chain contract behaves — only the testnet verification plan
// (TESTNET_VERIFICATION.md) can do that, after deployment.
// Run: node contracts/test-vault.mjs   (exit 0 = all checks passed)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

// ---------- (1) build artifact ----------
console.log("Build artifact checks:");
const wasm = fs.readFileSync(path.join(dir, "build/vault.wasm"));
check("WASM magic bytes (\\0asm)", wasm.subarray(0, 4).equals(Buffer.from([0, 0x61, 0x73, 0x6d])));
check("WASM non-empty", wasm.length > 1000, `(size ${wasm.length})`);
const methodsH = fs.readFileSync(path.join(dir, "build/methods.h"), "utf8");
const expected = ["init", "deposit", "set_policy", "add_to_allowlist", "remove_from_allowlist", "add_rule", "remove_rule", "request_payment", "confirm_payment", "get_policy", "get_allowlist", "get_rules", "get_spent_today", "get_payments", "get_balance"];
for (const m of expected) {
  check(`method exported: ${m}`, methodsH.includes(`DEFINE_NEAR_METHOD(${m})`));
}

// ---------- (2) policy logic mirror (same order as contracts/src/index.js) ----------
// Caps in yoctoNEAR (NOT USD): per-tx 1 NEAR, daily 2 NEAR, confirm 0.5 NEAR.
console.log("Policy logic mirror checks:");
const NEAR = 10n ** 24n;
const state = {
  perTx: 1n * NEAR,
  daily: 2n * NEAR,
  confirm: NEAR / 2n,
  spentDay: "10",
  spentToday: 0n,
  allowlist: new Set(["recallwallet-freelancer.testnet"]),
  balance: 5n * NEAR,
  day: "10",
};
function rollDay(day) {
  if (state.spentDay !== day) {
    state.spentDay = day;
    state.spentToday = 0n;
  }
}
function checkPolicy(to, amount) {
  // Mirror of Vault.checkPolicy + the balance guard, in the same order.
  if (amount > state.perTx) return { decision: "BLOCKED", rule: "perTxCap" };
  if (state.spentToday + amount > state.daily) return { decision: "BLOCKED", rule: "dailyCap" };
  if (!state.allowlist.has(to)) return { decision: "BLOCKED", rule: "allowlist" };
  if (amount > state.confirm) return { decision: "NEEDS_CONFIRMATION", rule: "confirmThreshold" };
  if (amount > state.balance) return { decision: "BLOCKED", rule: "insufficientBalance" };
  return { decision: "ALLOWED", rule: null };
}
const F = "recallwallet-freelancer.testnet";
rollDay("10");
check("small allowlisted payment ALLOWED", checkPolicy(F, NEAR / 5n).decision === "ALLOWED");
state.spentToday = NEAR / 5n; // 0.2 NEAR spent
check("over per-tx cap BLOCKED perTxCap", (() => { const r = checkPolicy(F, 2n * NEAR); return r.decision === "BLOCKED" && r.rule === "perTxCap"; })());
state.spentToday = (NEAR * 18n) / 10n; // 1.8 NEAR spent
check("over daily cap BLOCKED dailyCap", (() => { const r = checkPolicy(F, NEAR / 2n); return r.decision === "BLOCKED" && r.rule === "dailyCap"; })());
state.spentToday = 0n;
check("non-allowlisted recipient BLOCKED allowlist", (() => { const r = checkPolicy("random.testnet", NEAR / 10n); return r.decision === "BLOCKED" && r.rule === "allowlist"; })());
check("above confirm threshold NEEDS_CONFIRMATION, spent unchanged", (() => { const before = state.spentToday; const r = checkPolicy(F, (NEAR * 7n) / 10n); return r.decision === "NEEDS_CONFIRMATION" && r.rule === "confirmThreshold" && state.spentToday === before; })());
// Confirm re-check: recipient removed from allowlist between request and confirm -> blocked, funds stay.
state.allowlist.delete(F);
check("confirm re-check after allowlist removal BLOCKED allowlist", checkPolicy(F, (NEAR * 7n) / 10n).rule === "allowlist");
state.allowlist.add(F);
// Day rollover resets spent.
state.spentToday = (NEAR * 19n) / 10n;
rollDay("11");
check("new UTC day resets spent_today to 0", state.spentToday === 0n && state.spentDay === "11");
// Balance guard: policy passes but vault does not hold the funds.
state.balance = NEAR / 10n;
check("policy passes but vault short -> BLOCKED insufficientBalance", (() => { const r = checkPolicy(F, NEAR / 5n); return r.decision === "BLOCKED" && r.rule === "insufficientBalance"; })());

console.log(failures === 0 ? "\nAll vault checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
