import {test} from "node:test";
import assert from "node:assert/strict";
import {
 assessPublicObservations,appendPublicEvidence,publicEvidenceReceipt,
} from "../dist/index.js";

const NOW=1_760_000_000;
const passphrase="Test SDF Network ; September 2015";
function baseline(){
 return {
  checkedAtUnix:NOW,
  network:{network:"testnet",passphrase,source:"stellar-rpc",
    ledger_sequence:800,ledger_hash:"a".repeat(64),ledger_closed_at_unix:String(NOW-10)},
  observer:{source:"stellar-rpc",ledger_sequence:800,ledger_hash:"a".repeat(64),
    ledger_closed_at_unix:String(NOW-10)},
  readiness:{status:"ready",stellar_rpc:"connected",database:"connected",payments:"disabled"},
  capabilities:{payments_enabled:false,confidential_token_verified:false,
    private_payments_verified:false,fiat_payouts_enabled:false},
  contracts:{network:"testnet",on_chain_verified:false,payment_execution_enabled:false,
    manifest:{network:"testnet",status:"not-deployed",verified:false}},
 };
}
test("only actual fresh equal-hash public ledger observations may be current",()=>{
 const observed=assessPublicObservations(baseline());
 assert.equal(observed.verdict,"public-metadata-current");
 assert.equal(observed.observerComparison,"aligned");
 assert.equal(observed.ledgerGap,0);
 assert.equal(observed.paymentExecutionEnabled,false);
});
test("same ledger with contradictory hash is a conflict, not healthy",()=>{
 const input=baseline();input.observer.ledger_hash="f".repeat(64);
 const result=assessPublicObservations(input);
 assert.equal(result.verdict,"inconsistent");
 assert.equal(result.observerComparison,"conflict");
});
test("observer ahead of live Testnet is inconsistent and cannot present a negative lag",()=>{
 const input=baseline();input.observer.ledger_sequence=801;
 const result=assessPublicObservations(input);
 assert.equal(result.verdict,"inconsistent");
 assert.equal(result.observerComparison,"ahead");
 assert.equal(result.ledgerGap,null);
});
test("lagging or stale observer stays partial even with ready PostgreSQL",()=>{
 let input=baseline();
 input.observer.ledger_sequence=797;
 assert.equal(assessPublicObservations(input).observerComparison,"lagging");
 assert.equal(assessPublicObservations(input).ledgerGap,3);
 assert.equal(assessPublicObservations(input).verdict,"partial");
 input=baseline();input.observer.ledger_closed_at_unix=String(NOW-600);
 assert.equal(assessPublicObservations(input).observerComparison,"stale");
 assert.equal(assessPublicObservations(input).verdict,"partial");
});
test("wrong network, missing observer, absent database remain partial",()=>{
 const input=baseline();input.network.passphrase="Public Global Stellar Network ; September 2015";
 assert.equal(assessPublicObservations(input).liveFresh,false);
 assert.equal(assessPublicObservations(input).verdict,"partial");
 const missing=baseline();missing.observer=null;
 assert.equal(assessPublicObservations(missing).observerComparison,"unavailable");
 assert.equal(assessPublicObservations(missing).observerLedger,null);
 const noDb=baseline();noDb.readiness=null;
 assert.equal(assessPublicObservations(noDb).verdict,"partial");
});
test("unsupported claims never imply payment execution or confidentiality",()=>{
 const input=baseline();input.capabilities.payments_enabled=true;
 assert.equal(assessPublicObservations(input).verdict,"unsupported-claim");
 assert.equal(assessPublicObservations(input).paymentExecutionEnabled,false);
 const deployed=baseline();deployed.contracts.manifest.status="deployed";
 assert.equal(assessPublicObservations(deployed).verdict,"unsupported-claim");
});
test("bounded readings replace same-second checks, drop stale history, and export only sanitized public fields",()=>{
 const first=assessPublicObservations(baseline());
 let records=[];
 for(let i=0;i<19;i++){
  records=appendPublicEvidence(records,{...first,checkedAtUnix:NOW+i},5);
 }
 assert.equal(records.length,5);
 assert.deepEqual(records.map(r=>r.checkedAtUnix),
  [NOW+14,NOW+15,NOW+16,NOW+17,NOW+18]);
 records=appendPublicEvidence(records,{...first,checkedAtUnix:NOW+18,
  verdict:"partial"},5);
 assert.equal(records.length,5);
 assert.equal(records.at(-1).verdict,"partial");
 const receipt=publicEvidenceReceipt(records,NOW+20);
 assert.equal(receipt.paymentExecutionEnabled,false);
 assert.equal(receipt.network,"testnet");
 assert.equal(receipt.observations.length,5);
 assert.deepEqual(Object.keys(receipt.observations[0]),
  ["checkedAtUnix","liveLedger","observerLedger","ledgerGap","observerComparison","verdict"]);
 assert.ok(!JSON.stringify(receipt).includes(passphrase));
 assert.ok(!JSON.stringify(receipt).includes("ledger_hash"));
 assert.throws(()=>appendPublicEvidence(records,first,61),RangeError);
 assert.throws(()=>publicEvidenceReceipt(records,-1),TypeError);
});
