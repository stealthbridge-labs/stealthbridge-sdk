import {test} from "node:test";
import assert from "node:assert/strict";
import {assessRegistryUpgrade} from "../dist/index.js";
const proposal={wasm_hash:"ab".repeat(32),ready_at_ledger:200,expires_at_ledger:10_200};
const obs=()=>({
 network:"testnet",registry:"policy-registry",currentLedger:200,paused:true,
 candidateWasmSha256:"ab".repeat(32),pending:{...proposal},
});
test("open upgrade ledger window is NEVER wallet authorization",()=>{
 const result=assessRegistryUpgrade(obs());
 assert.equal(result.state,"window-open-unverified");
 assert.equal(result.hashMatches,true);
 assert.equal(result.authorizedToExecute,false);
 assert.equal(result.manualSigningRequired,true);
 assert.equal(result.financialExecutionEnabled,false);
});
test("wrong, zero and changed candidate hashes fail closed",()=>{
 for(const hash of ["cd".repeat(32),"0".repeat(64),"AB".repeat(32),"malformed"]){
  const result=assessRegistryUpgrade({...obs(),candidateWasmSha256:hash});
  assert.equal(result.state,"invalid");
  assert.equal(result.authorizedToExecute,false);
 }
});
test("pause, timelock and expiry cannot be bypassed",()=>{
 assert.equal(assessRegistryUpgrade({...obs(),paused:false}).state,"waiting");
 assert.equal(assessRegistryUpgrade({...obs(),currentLedger:199}).state,"waiting");
 assert.equal(assessRegistryUpgrade({...obs(),currentLedger:10_200}).state,"window-open-unverified");
 assert.equal(assessRegistryUpgrade({...obs(),currentLedger:10_201}).state,"expired");
});
test("unknown network, gate upgrade and fabricated expiry windows are invalid",()=>{
 for(const change of [
  {network:"mainnet"},
  {registry:"governance-gate"},
  {pending:{...proposal,expires_at_ledger:12_000}},
  {currentLedger:0},
  {pending:{...proposal,wasm_hash:"c".repeat(64)}},
 ]){
  const result=assessRegistryUpgrade({...obs(),...change});
  assert.equal(result.state,"invalid");
  assert.equal(result.authorizedToExecute,false);
 }
 assert.equal(assessRegistryUpgrade({...obs(),pending:null}).state,"not-proposed");
});
