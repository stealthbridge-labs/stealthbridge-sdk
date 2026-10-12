import { test } from "node:test";
import assert from "node:assert/strict";
import { assessTransferCapability, assessWalletOwnedAdapter } from "../dist/transfer-capability.js";
const base = { network:"testnet",rail:"confidential-token",independentlyVerified:false,proofAvailable:false,walletSupported:false };
test("unverified privacy rail always fails closed",()=>assert.deepEqual(assessTransferCapability(base),{supported:false,reason:"UNVERIFIED_RAIL"}));
test("missing proof fails closed",()=>assert.deepEqual(assessTransferCapability({...base,independentlyVerified:true}),{supported:false,reason:"MISSING_PROOF"}));
test("unsupported wallet fails closed",()=>assert.deepEqual(assessTransferCapability({...base,independentlyVerified:true,proofAvailable:true}),{supported:false,reason:"UNSUPPORTED_WALLET"}));
test("even full evidence cannot enable execution",()=>assert.deepEqual(assessTransferCapability({...base,independentlyVerified:true,proofAvailable:true,walletSupported:true}),{supported:false,reason:"EXECUTION_DISABLED"}));

test("runtime wrong-network cannot be laundered through TypeScript declarations",()=>{
  assert.deepEqual(assessTransferCapability({...base,network:"public",independentlyVerified:true,proofAvailable:true,walletSupported:true}),
    {supported:false,reason:"WRONG_NETWORK"});
});
test("unknown privacy rail and missing evidence fail closed",()=>{
  assert.deepEqual(assessTransferCapability({...base,rail:"unsupported"}),{supported:false,reason:"UNSUPPORTED_RAIL"});
  assert.deepEqual(assessTransferCapability(null),{supported:false,reason:"WRONG_NETWORK"});
});

const wallet={
 custody:"device-only",
 networkPassphrase:"Test SDF Network ; September 2015",
 recovery:"device-owned-encrypted-backup",
 antiReplay:"account-network-rail-nonce-bound"
};
const confidential={
 rail:"confidential-token", privacyModel:"amount-and-balance-only",
 visibleOnLedger:"sender-and-recipient", prover:"ultrahonk",
 wallet, readOnly:true, transferExecutionEnabled:false
};
const privatePayments={
 rail:"private-payments", privacyModel:"pool-notes-and-counterparty-shielding",
 visibleOnLedger:"pool-entry-and-exit",prover:"groth16",notes:"encrypted-user-device-only",
 wallet,readOnly:true,transferExecutionEnabled:false
};
test("confidential amount-only adapter remains design-only even with verified inputs",()=>{
 const evidence={...base,independentlyVerified:true,proofAvailable:true,walletSupported:true};
 assert.deepEqual(assessWalletOwnedAdapter(confidential,evidence),{supported:false,reason:"EXECUTION_DISABLED"});
});
test("private pool note model is distinct and cannot route via confidential token prover",()=>{
 const evidence={...base,rail:"private-payments",independentlyVerified:true,proofAvailable:true,walletSupported:true};
 assert.deepEqual(assessWalletOwnedAdapter(privatePayments,evidence),{supported:false,reason:"EXECUTION_DISABLED"});
 assert.deepEqual(assessWalletOwnedAdapter({...privatePayments,prover:"ultrahonk"},evidence),
  {supported:false,reason:"UNSUPPORTED_RAIL"});
 assert.deepEqual(assessWalletOwnedAdapter(confidential,evidence),{supported:false,reason:"UNSUPPORTED_RAIL"});
});
test("wallet custody, nonce binding and Testnet passphrase must be explicit",()=>{
 for(const wrong of [
  {...wallet,networkPassphrase:"Public Global Stellar Network ; September 2015"},
  {...wallet,custody:"backend-hosted"},
  {...wallet,recovery:"backend-database"},
  {...wallet,antiReplay:"none"}
 ]){
  assert.deepEqual(assessWalletOwnedAdapter({...confidential,wallet:wrong},base),
   {supported:false,reason:"UNSUPPORTED_WALLET"});
 }
});
test("no adapter descriptor can enable signing, transfer or return a secret",()=>{
 assert.equal("sign" in confidential,false);
 assert.equal("transfer" in privatePayments,false);
 assert.equal(JSON.stringify(privatePayments).includes("seedPhrase"),false);
 assert.deepEqual(assessWalletOwnedAdapter({...privatePayments,transferExecutionEnabled:true},
  {...base,rail:"private-payments"}),{supported:false,reason:"UNSUPPORTED_WALLET"});
});
