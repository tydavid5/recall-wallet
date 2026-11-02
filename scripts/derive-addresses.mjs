// Recall Wallet Agent — Chain Signatures address derivation (read-only, no keys, no funds).
// Derives the foreign addresses controlled by a NEAR testnet account via the
// testnet MPC contract v1.signer-prod.testnet. The same account + path
// always produces the same address; distinct paths are used per chain,
// so a signature for one chain cannot authorise another.
import { chainAdapters, contracts } from "chainsig.js";

const accountId = process.argv[2] || "recallwallet.testnet";
const contract = new contracts.ChainSignatureContract({
  networkId: "testnet",
  contractId: "v1.signer-prod.testnet",
});
const evm = new chainAdapters.evm.EVM({ publicClient: null, contract });

console.log(`NEAR account: ${accountId}`);
console.log("MPC contract: v1.signer-prod.testnet (testnet)");
for (const [chain, path] of [
  ["Ethereum", "ethereum-1"],
  ["Base", "base-1"],
]) {
  const { address, publicKey } = await evm.deriveAddressAndPublicKey(accountId, path);
  console.log(` ${chain} (path ${path}): ${address}`);
  console.log(`   publicKey: ${publicKey}`);
}
console.log("No private key was used or created — these addresses are");
console.log("deterministically derived from the account + path + MPC key.");
