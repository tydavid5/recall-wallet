// Recall Wallet Agent — spending policy engine (pure logic, no chain, no funds).
// A payment is either ALLOWED, BLOCKED (with the exact rule that stopped
// it), or NEEDS_CONFIRMATION (above the confirm threshold, below the cap).

function createPolicy({
  dailyCapUsd = 100,
  perTxCapUsd = 100,
  confirmAboveUsd = 50,
  allowlist = [],
} = {}) {
  return {
    dailyCapUsd,
    perTxCapUsd,
    confirmAboveUsd,
    allowlist: new Set(allowlist),
    // spent today, in USD — in the full app this is read from the
    // on-chain memory contract; here it is passed in per check.
    check({ amountUsd, toAddress, spentTodayUsd = 0, confirmed = false }) {
      if (amountUsd > perTxCapUsd) {
        return {
          decision: "BLOCKED",
          reason: `Amount $${amountUsd} exceeds the per-transaction cap of $${perTxCapUsd}.`,
          rule: "perTxCap",
        };
      }
      if (spentTodayUsd + amountUsd > dailyCapUsd) {
        return {
          decision: "BLOCKED",
          reason: `This would take today's spending to $${spentTodayUsd + amountUsd}, over the daily cap of $${dailyCapUsd}.`,
          rule: "dailyCap",
        };
      }
      if (this.allowlist.size > 0 && !this.allowlist.has(toAddress)) {
        return {
          decision: "BLOCKED",
          reason: `Address ${toAddress} is not on your allowlist, and new addresses need your approval first.`,
          rule: "allowlist",
        };
      }
      if (amountUsd > confirmAboveUsd && !confirmed) {
        return {
          decision: "NEEDS_CONFIRMATION",
          reason: `Amount $${amountUsd} is above your $${confirmAboveUsd} confirmation threshold. Confirm to proceed.`,
          rule: "confirmThreshold",
        };
      }
      return { decision: "ALLOWED", reason: "Passes all spending rules.", rule: null };
    },
  };
}

module.exports = { createPolicy };
