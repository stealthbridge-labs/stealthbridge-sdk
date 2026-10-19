import {test} from "node:test";
import assert from "node:assert/strict";
import {classifyPublicStellarAddress,preparePrivateTransfer} from "../dist/index.js";
const G="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const C="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
test("recognizes checksummed Stellar identities without inventing smart-account ownership",()=>{
 assert.deepEqual(classifyPublicStellarAddress(G),{
  address:G,kind:"classic",ownershipVerified:false,smartWalletCodeVerified:false
 });
 assert.equal(classifyPublicStellarAddress(C)?.kind,"contract-candidate");
 assert.equal(classifyPublicStellarAddress("CAAAAA"),null);
 assert.equal(classifyPublicStellarAddress(C.slice(0,-1)+"Z"),null);
});
test("validated local private-payment plans never unlock proof or settlement",()=>{
 const good=preparePrivateTransfer({sender:G,recipient:C,amount:"25.125",
  rail:"confidential-token",backendTestnetFresh:true});
 assert.equal(good.validLocalDraft,true);
 assert.equal(good.submissionAvailable,false);
 assert.ok(good.blockReasons.includes("confidential-proof-unverified"));
 assert.ok(good.blockReasons.includes("payment-execution-disabled"));
 const self=preparePrivateTransfer({sender:G,recipient:G,amount:"5",rail:"private-payments",backendTestnetFresh:true});
 assert.equal(self.validLocalDraft,false);
 assert.ok(self.blockReasons.includes("self-payment"));
 assert.equal(self.submissionAvailable,false);
 const unsafe=preparePrivateTransfer({sender:null,recipient:"x",amount:"1000000000000000.12345678",
  rail:"private-payments",backendTestnetFresh:false});
 assert.equal(unsafe.validLocalDraft,false);
 assert.equal(unsafe.submissionAvailable,false);
 assert.ok(unsafe.blockReasons.includes("private-pool-unverified"));
});
