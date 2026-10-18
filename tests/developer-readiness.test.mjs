import test from "node:test";
import assert from "node:assert/strict";
import {assessDeveloperReadiness} from "../dist/index.js";

const NOW=1_800_000_000;
const fresh=()=>({
 network:{
  network:"testnet",passphrase:"Test SDF Network ; September 2015",
  source:"stellar-rpc",ledger_sequence:100,ledger_closed_at_unix:String(NOW-10)
 },
 readiness:{status:"ready",stellar_rpc:"connected",database:"connected",payments:"disabled"},
 capabilities:{
  payments_enabled:false,confidential_token_verified:false,
  private_payments_verified:false,fiat_payouts_enabled:false
 },
 catalog:{
  product:"StealthBridge",network:"testnet",payment_execution_enabled:false,
  privacy_verified:false,mainnet_enabled:false,
  modules:["wallet","corridors","quotes","payments","batch-payouts","approvals","reconciliation",
   "webhooks","privacy-proofs","disclosure","partner-settlement"].map(id=>({
    id, availability:id==="corridors"?"metadata-only":"blocked"
   }))
 },
 contracts:{
  on_chain_verified:false,payment_execution_enabled:false,
  manifest:{network:"testnet",status:"not-deployed",verified:false}
 }
});
test("fresh Testnet discovery is never payment approval",()=>{
 const result=assessDeveloperReadiness(fresh(),NOW);
 assert.equal(result.verdict,"read-only-ready");
 assert.deepEqual(result.checks.map(c=>c.state),Array(5).fill("observed"));
 assert.equal(result.funds_movement_enabled,false);
 assert.equal(result.wallet_signing_enabled,false);
 assert.equal(result.fiat_payouts_enabled,false);
});
test("missing dependencies degrade safely",()=>{
 const a=assessDeveloperReadiness({},NOW);
 assert.equal(a.verdict,"degraded");
 assert(a.checks.every(c=>c.state==="unavailable"));
 const v=fresh();v.readiness.database="not-configured";v.readiness.status="degraded";
 assert.equal(assessDeveloperReadiness(v,NOW).verdict,"degraded");
});
test("stale/future ledger never counts as fresh",()=>{
 const v=fresh();
 v.network.ledger_closed_at_unix=String(NOW-200);
 assert.equal(assessDeveloperReadiness(v,NOW).verdict,"degraded");
 v.network.ledger_closed_at_unix=String(NOW+60);
 assert.equal(assessDeveloperReadiness(v,NOW).verdict,"degraded");
});
test("wrong network and inflated payment/contract claims fail closed",()=>{
 const modifications=[
  v=>{v.network.passphrase="Public Global Stellar Network ; September 2015";},
  v=>{v.capabilities.payments_enabled=true;},
  v=>{v.catalog.mainnet_enabled=true;},
  v=>{v.catalog.modules[3].availability="metadata-only";},
  v=>{v.contracts.on_chain_verified=true;},
  v=>{v.contracts.manifest.status="deployed";},
  v=>{v.readiness.payments="enabled";},
 ];
 for(const modify of modifications){
  const v=fresh();modify(v);
  const result=assessDeveloperReadiness(v,NOW);
  assert.equal(result.verdict,"unsafe-claim");
  assert(result.checks.some(c=>c.state==="unsafe"));
  assert.equal(result.funds_movement_enabled,false);
 }
});
