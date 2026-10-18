import {test} from "node:test";
import assert from "node:assert/strict";
import {assessGovernanceObservations} from "../dist/index.js";

test("missing responses fail closed",()=>{
 const result=assessGovernanceObservations(null,null,null);
 assert.equal(result.state,"unverified");
 assert.equal(result.trustedForExecution,false);
 assert.equal(result.paymentsEnabled,false);
 assert.equal(result.feesEnabled,false);
 assert.equal(result.observedLedger,null);
});
test("forged payment capability is never interpreted as verified",()=>{
 const forged={schema_version:1,network:"testnet",payment_execution_enabled:true};
 const result=assessGovernanceObservations(forged,forged,forged);
 assert.equal(result.state,"unverified");
 assert.equal(result.privacyVerified,false);
});
test("malformed partial evidence stays denied",()=>{
 const result=assessGovernanceObservations({contracts:[]},{contracts:[]},{contracts:[]});
 assert.equal(result.trustedForExecution,false);
});
