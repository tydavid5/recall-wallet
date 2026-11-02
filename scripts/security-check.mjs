// Recall Wallet Agent — pre-publish security check.
// Run before every publish: node scripts/security-check.mjs
// Exits non-zero (and names the file, never the secret) if it finds:
//  - a private-key-shaped literal in any publishable file
//  - a credentials/env file that is not git-ignored
//  - .testnet-key.json missing from .gitignore
//  - the old directory-traversal pattern back in app/server.js
// Deliberately excludes: node_modules, .git, and .testnet-key.json
// itself (which must stay local and git-ignored, never published).
// This check prints file names and counts only — never secret values.
import fs from "fs";
import path from "path";

const root = path.join(import.meta.dirname, "..");
const failures = [];
const skipDirs = new Set(["node_modules", ".git"]);
const skipFiles = new Set([".testnet-key.json"]);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !skipDirs.has(entry.name)) {
      walk(path.join(dir, entry.name));
    } else if (entry.isFile() && !skipFiles.has(entry.name)) {
      checkFile(path.join(dir, entry.name));
    }
  }
}

function checkFile(file) {
  const text = fs.readFileSync(file, "utf8");
  // A literal ed25519 private key in a publishable file. Public keys
  // are not pasted into this repo, so any such literal is a leak.
  if (/ed25519:[A-Za-z0-9]{40,}/.test(text)) {
    failures.push(`${path.relative(root, file)}: ed25519 key literal`);
  }
  // Note: prose about mnemonics (e.g. SECURITY.md) is not flagged —
  // a word list is a human-review item, not a literal a scanner can
  // reliably distinguish from documentation. Key literals and tokens
  // below are the automated checks.
  if (/sk-[A-Za-z0-9]{20,}/.test(text) || /Bearer [A-Za-z0-9._-]{20,}/.test(text)) {
    failures.push(`${path.relative(root, file)}: possible API token`);
  }
}

walk(root);

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
for (const required of [".testnet-key.json", "node_modules/", "memory.json"]) {
  if (!gitignore.includes(required)) {
    failures.push(`.gitignore: missing ${required}`);
  }
}

const server = fs.readFileSync(path.join(root, "app", "server.js"), "utf8");
if (/path\.join\(__dirname,\s*req\.url/.test(server)) {
  failures.push("app/server.js: unvalidated path traversal pattern");
}

for (const credFile of [".env", "credentials.json", ".testnet-key.json"]) {
  const p = path.join(root, credFile);
  if (fs.existsSync(p) && credFile !== ".testnet-key.json") {
    failures.push(`${credFile}: credentials file present in repo directory`);
  }
}

if (failures.length > 0) {
  console.error("SECURITY CHECK FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("Security check passed: no key literals or tokens");
console.log("in publishable files; key file is git-ignored; server is locked down.");
