// Recall Wallet — rule/preference memory across sessions.
// File-backed here so the terminal demo persists rules between runs.
// The NEAR smart contract version (contracts/) will replace this store
// with on-chain memory; the interface (remember/recall) stays the same.

const fs = require("fs");
const path = require("path");

class Memory {
  constructor(filePath) {
    this.filePath = filePath || path.join(__dirname, "..", "memory.json");
    this.data = { rules: [], preferences: {}, spentTodayUsd: 0, spentDay: null };
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      } catch {
        // Corrupt file: start fresh rather than crash the demo.
        this.data = { rules: [], preferences: {}, spentTodayUsd: 0, spentDay: null };
      }
    }
  }

  rememberRule(text) {
    this.data.rules.push({ text, at: new Date().toISOString() });
    this.save();
    return this.data.rules.length;
  }

  recallRules() {
    return this.data.rules.map((r) => r.text);
  }

  setPreference(key, value) {
    this.data.preferences[key] = value;
    this.save();
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

module.exports = { Memory };
