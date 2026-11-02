// Recall Wallet Agent — 3-act terminal demo (no keys, no funds).
const { createPolicy } = require("./policy");
const { Memory } = require("./memory");

const memory = new Memory();
if (memory.recallRules().length === 0) {
  memory.rememberRule("Never spend more than $100 a day.");
  memory.rememberRule("Never pay a brand-new address without asking first.");
  memory.setPreference("freelancerAddress", "0xFreelancerOnBase");
}

const policy = createPolicy({
  dailyCapUsd: 100,
  perTxCapUsd: 100,
  confirmAboveUsd: 50,
  allowlist: ["0xFreelancerOnBase"],
});

console.log("Recall Wallet Agent — remembered rules:");
for (const rule of memory.recallRules()) console.log(" -", rule);

console.log("\nAct 2 — payment that passes:");
console.log(
  policy.check({ amountUsd: 20, toAddress: "0xFreelancerOnBase", spentTodayUsd: 0 })
);

console.log("\nAct 3 — payment that gets blocked:");
console.log(
  policy.check({ amountUsd: 500, toAddress: "0xRandomAddress", spentTodayUsd: 0 })
);

console.log("\nAct 3b — payment that needs confirmation:");
console.log(
  policy.check({ amountUsd: 60, toAddress: "0xFreelancerOnBase", spentTodayUsd: 0 })
);
console.log(
  "…and with confirmation:",
  policy.check({
    amountUsd: 60,
    toAddress: "0xFreelancerOnBase",
    spentTodayUsd: 0,
    confirmed: true,
  })
);
