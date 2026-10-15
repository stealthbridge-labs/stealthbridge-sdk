import {test} from "node:test";
import assert from "node:assert/strict";
import {StealthBridgeClient,ApiError,validPlatformCatalog} from "../dist/index.js";

const audience = ["consumer", "business", "developer", "partner"];
const blocked = new Set(["quotes", "payments", "batch-payouts", "privacy-proofs", "partner-settlement"]);
const ids = ["wallet", "corridors", "quotes", "payments", "batch-payouts",
  "approvals", "reconciliation", "webhooks", "privacy-proofs", "disclosure", "partner-settlement"];
const catalog = () => ({
  product:"StealthBridge", network:"testnet", payment_execution_enabled:false,
  privacy_verified:false, mainnet_enabled:false,
  modules:ids.map(id => ({
    id, audiences: audience,
    availability:id==="corridors"?"metadata-only":blocked.has(id)?"blocked":"planned",
    description:"Not a verified financial service",
  })),
});
test("valid catalog can be read through same-origin SDK without any writes",async()=>{
  const calls=[];
  const sdk=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",fetchImpl:async (url,options)=>{
    calls.push([url,options.method]);
    return new Response(JSON.stringify(catalog()),{headers:{"content-type":"application/json"}});
  }});
  assert.equal((await sdk.platformModules()).modules.length,11);
  assert.deepEqual(calls,[["/api/bridge/v1/platform/modules","GET"]]);
});
test("product catalog is fail-closed for false payment, privacy, mainnet or module claims",async()=>{
  const variants=[
    value=>{value.payment_execution_enabled=true;},
    value=>{value.privacy_verified=true;},
    value=>{value.mainnet_enabled=true;},
    value=>{value.network="public";},
    value=>{value.modules[0].availability="metadata-only";},
    value=>{value.modules[3].availability="planned";},
    value=>{value.modules.push({...value.modules[0]});},
    value=>{value.modules[2].audiences=["untrusted"];},
    value=>{value.modules[2].description="";},
  ];
  for(const mutate of variants){
    const payload=catalog();mutate(payload);
    assert.equal(validPlatformCatalog(payload),false);
    const sdk=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
      fetchImpl:async()=>new Response(JSON.stringify(payload),{headers:{"content-type":"application/json"}})});
    await assert.rejects(sdk.platformModules(),e=>e instanceof ApiError&&e.status===502);
  }
});
test("missing module is never accepted as future permission",()=>{
  const payload=catalog();payload.modules.pop();
  assert.equal(validPlatformCatalog(payload),false);
});
