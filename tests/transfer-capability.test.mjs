import { test } from "node:test";
import assert from "node:assert/strict";
import { assessTransferCapability } from "../dist/transfer-capability.js";
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
