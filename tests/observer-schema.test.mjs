import {test} from "node:test";
import assert from "node:assert/strict";
import {StealthBridgeClient,validObserverSchema,ApiError} from "../dist/index.js";

const pending=()=>({
 schema_version:1,network:"testnet",source:"postgresql-sqlx-migrations",
 schema_status:"migrations-pending",registered_migrations:7,required_migrations:10,
 payment_execution_enabled:false,fee_collection_enabled:false
});
test("typed schema evidence distinguishes incomplete migrations without unlocking payments",()=>{
 assert.equal(validObserverSchema(pending()),true);
 for(const mutate of [
  v=>v.payment_execution_enabled=true,
  v=>v.fee_collection_enabled=true,
  v=>v.schema_status="current",
  v=>v.registered_migrations=12,
  v=>v.required_migrations=7,
  v=>v.observer_worker_running=true,
  v=>v.network="public"
 ]){
  const forged=structuredClone(pending());mutate(forged);
  assert.equal(validObserverSchema(forged),false);
 }
 assert.equal(validObserverSchema({...pending(),schema_status:"current",registered_migrations:10}),true);
 assert.equal(validObserverSchema({...pending(),schema_status:"unavailable",registered_migrations:null}),true);
 assert.equal(validObserverSchema({...pending(),schema_status:"not-configured",registered_migrations:null}),true);
 assert.equal(validObserverSchema({...pending(),schema_status:"schema-incomplete",registered_migrations:10}),true);
});
test("observerSchema only calls a GET endpoint and rejects forged financial ability",async()=>{
 const seen=[];
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async(url,opts)=>{
   seen.push([url,opts.method]);return new Response(JSON.stringify(pending()),{headers:{"content-type":"application/json"}});
  }});
 assert.equal((await client.observerSchema()).registered_migrations,7);
 assert.deepEqual(seen,[["/api/bridge/v1/observer/schema","GET"]]);
 const invalid=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async()=>new Response(JSON.stringify({...pending(),payment_execution_enabled:true}),{headers:{"content-type":"application/json"}})});
 await assert.rejects(invalid.observerSchema(),ApiError);
});
