import {test} from "node:test";
import assert from "node:assert/strict";
import {validDependencyDiagnostics} from "../dist/dependency-diagnostics.js";
import {StealthBridgeClient} from "../dist/index.js";
const now=1800000000;
const safe={schema_version:1,network:"testnet",source:"live-backend-probes",
 observed_at_unix:now,rpc:"connected",database:"ready",read_only_ready:true,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
test("diagnostic states do not grant financial execution",()=>{
 for(const db of ["ready","schema-incomplete","unreachable","not-configured"]){
  const value={...safe,database:db,read_only_ready:db==="ready"};
  assert.equal(validDependencyDiagnostics(value,now),true);
 }
 for(const bad of [
  {...safe,network:"mainnet"},{...safe,payment_execution_enabled:true},
  {...safe,privacy_verified:true},{...safe,fiat_payouts_enabled:true},
  {...safe,read_only_ready:false},{...safe,rpc:"unavailable"},
  {...safe,database:"schema-incomplete"},{...safe,database:"fully-verified"},
  {...safe,unexpected:"authority"},{...safe,observed_at_unix:now-121},
  {...safe,observed_at_unix:now+31}
 ])assert.equal(validDependencyDiagnostics(bad,now),false);
});
test("SDK offers a bounded read-only diagnostic API",async()=>{
 let requested="";
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async url=>{requested=String(url);return new Response(JSON.stringify({...safe,observed_at_unix:Math.floor(Date.now()/1000)}),
   {status:200,headers:{"content-type":"application/json"}});}});
 assert.equal((await client.dependencyDiagnostics()).database,"ready");
 assert.equal(requested,"/api/bridge/v1/diagnostics");
});
