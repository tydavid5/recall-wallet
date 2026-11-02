// Recall Wallet — rotate the testnet account key (testnet only).
//
// Why this exists: a security scan printed the old key file's contents
// into a tool log. The key is testnet-only and worthless, but the safe
// response is still to rotate it: add a new full-access key, delete the
// old one, and rewrite .testnet-key.json with 0600 permissions.
// This script NEVER prints a private key — only public keys and tx hashes.
// Usage: node scripts/rotate-testnet-key.mjs
import fs from "fs";
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  PublicKey,
} from "near-api-js";

const keyPath = new URL("../.testnet-key.json", import.meta.url);
const old = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const oldKeyPair = KeyPair.fromString(old.privateKey);
const oldPublicKey = oldKeyPair.getPublicKey().toString();

const newKeyPair = KeyPair.fromRandom("ed25519");
const newPublicKey = newKeyPair.getPublicKey().toString();

const provider = new JsonRpcProvider({ url: "https://rpc.testnet.near.org" });
const account = new Account(
  old.accountId,
  provider,
  new KeyPairSigner(oldKeyPair)
);

console.log("Account:", old.accountId);
console.log("Old public key (to be deleted):", oldPublicKey);
console.log("New public key (to be added):", newPublicKey);

const addOutcome = await account.addFullAccessKey(PublicKey.from(newPublicKey));
console.log("Add-key tx:", addOutcome?.transaction?.hash);

const delOutcome = await account.deleteKey(PublicKey.from(oldPublicKey));
console.log("Delete-key tx:", delOutcome?.transaction?.hash);

fs.writeFileSync(
  keyPath,
  JSON.stringify({ accountId: old.accountId, privateKey: newKeyPair.toString() })
);
fs.chmodSync(keyPath, 0o600);
console.log("Wrote new .testnet-key.json with 0600 permissions.");
console.log("Old key is now deleted on-chain and must no longer be used.");
