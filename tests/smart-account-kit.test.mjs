import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {StealthBridgeClient,ApiError,validSmartAccountKitSnapshot} from "../dist/index.js";
const now=1800000000;
// Independent copy of reviewed public upstream pins; no runtime sibling dependency.
const account="c514d35ea67eaea9bfc1fb3327854c0c06111bc1ddebd4fe217c504c1004b9e1";
const webauthn="e63a030d0f1a1481e36059a4837c433083b33e704c1f9625b7314795b6d72b76";
const threshold="f72a11de6e2d5d2495d98fe61e04cd13544e64156a5a3be83ef8c2e403d14a94";
const spending="9bc17db0a804d6c82231a268c43bac1413650ea92cac0022e0d0a3b66ddc8189";
function snapshot(time=now){return {
 schema_version:1,network:"testnet",source:"stellar-rpc/pinned-smart-account-kit",kit_version:"0.10.0",
 observed_at_unix:time,observed_ledger_sequence:1000,
 entries:[['account_code','code',account],['webauthn_instance','instance',webauthn],
 ['webauthn_code','code',webauthn],['threshold_instance','instance',threshold],
 ['threshold_code','code',threshold],['spendingLimit_instance','instance',spending],
 ['spendingLimit_code','code',spending]].map(([name,kind,hash])=>({name,kind,
 expected_wasm_hash:hash,observed_wasm_hash:hash,status:'live',live_until_ledger:121961,ttl_remaining_ledgers:120961})),
 all_entries_healthy:true,customer_smart_account_factory_deployed:false,customer_smart_account_created:false,
 credential_recovery_verified:false,privacy_proofs_verified:false,mainnet_enabled:false,
 financial_execution_enabled:false,operator_managed_deployment:true,
};}
function reject(label,mutate){test(label,()=>{const v=snapshot();mutate(v);assert.equal(validSmartAccountKitSnapshot(v,now),false);});}
test('accepts exact ordered healthy public upstream artifacts without customer release',()=>{
 const v=snapshot();assert.equal(validSmartAccountKitSnapshot(v,now),true);
 assert.equal(v.customer_smart_account_created,false);assert.equal(v.financial_execution_enabled,false);
});
for(const ttl of [0,120960])test(`accepts low TTL boundary ${ttl}`,()=>{
 const v=snapshot();Object.assign(v.entries[1],{status:'low_ttl',live_until_ledger:1000+ttl,ttl_remaining_ledgers:ttl});
 v.all_entries_healthy=false;assert.equal(validSmartAccountKitSnapshot(v,now),true);
});
test('accepts unavailable evidence with null hash and TTL',()=>{
 const v=snapshot();Object.assign(v.entries[3],{status:'unavailable',observed_wasm_hash:null,live_until_ledger:null,ttl_remaining_ledgers:null});
 v.all_entries_healthy=false;assert.equal(validSmartAccountKitSnapshot(v,now),true);
});
test('accepts explicit mismatch only as unhealthy evidence',()=>{
 for(const ttl of [true,false]){
  const v=snapshot();Object.assign(v.entries[0],{status:'mismatch',observed_wasm_hash:'ab'.repeat(32),
   ...(ttl?{}:{live_until_ledger:null,ttl_remaining_ledgers:null})});
  v.all_entries_healthy=false;assert.equal(validSmartAccountKitSnapshot(v,now),true);
 }
});
reject('rejects stale observation',v=>v.observed_at_unix=now-91);
reject('rejects future observation',v=>v.observed_at_unix=now+31);
for(const time of [0,-1,1.2,Number.MAX_SAFE_INTEGER+1,'1800000000'])reject(`rejects invalid unix seconds ${time}`,v=>v.observed_at_unix=time);
for(const ledger of [0,-1,1.2,Number.MAX_SAFE_INTEGER+1,'1000'])reject(`rejects invalid ledger ${ledger}`,v=>v.observed_ledger_sequence=ledger);
reject('rejects random entry order',v=>[v.entries[1],v.entries[4]]=[v.entries[4],v.entries[1]]);
reject('rejects duplicate entries',v=>v.entries[1]=v.entries[0]);
reject('rejects extra entry',v=>v.entries.push(v.entries[0]));
reject('rejects missing entry',v=>v.entries.pop());
reject('rejects wrong name casing',v=>v.entries[5].name='spendinglimit_instance');
reject('rejects instance/code kind drift',v=>v.entries[1].kind='code');
reject('rejects expected pin drift',v=>v.entries[0].expected_wasm_hash='ab'.repeat(32));
reject('rejects live observed hash drift',v=>v.entries[0].observed_wasm_hash='ab'.repeat(32));
reject('rejects low TTL observed hash drift',v=>Object.assign(v.entries[0],{status:'low_ttl',observed_wasm_hash:'ab'.repeat(32),live_until_ledger:1000,ttl_remaining_ledgers:0}));
reject('rejects uppercase observed hashes',v=>v.entries[0].observed_wasm_hash=account.toUpperCase());
reject('rejects forged mismatch with matching hash',v=>{v.entries[0].status='mismatch';v.all_entries_healthy=false;});
reject('rejects unknown status',v=>v.entries[0].status='ready');
reject('rejects missing top-level field',v=>delete v.source);
reject('rejects missing nested field',v=>delete v.entries[0].status);
reject('rejects extra top-level claims',v=>v.customer_owned=true);
reject('rejects extra nested claims',v=>v.entries[0].customer_owned=true);
reject('rejects corrupt network',v=>v.network='mainnet');
reject('rejects corrupt source',v=>v.source='operator');
reject('rejects wrong kit version',v=>v.kit_version='0.10.1');
reject('rejects wrong schema version',v=>v.schema_version='1');
reject('rejects fabricated TTL subtraction',v=>v.entries[0].ttl_remaining_ledgers++);
reject('rejects negative TTL',v=>Object.assign(v.entries[0],{status:'low_ttl',ttl_remaining_ledgers:-1,live_until_ledger:999}));
reject('rejects fractional TTL',v=>Object.assign(v.entries[0],{ttl_remaining_ledgers:120961.5,live_until_ledger:121961.5}));
reject('rejects live at low TTL threshold',v=>Object.assign(v.entries[0],{ttl_remaining_ledgers:120960,live_until_ledger:121960}));
reject('rejects low TTL above threshold',v=>v.entries[0].status='low_ttl');
reject('rejects unavailable fabricated TTL',v=>{Object.assign(v.entries[0],{status:'unavailable',observed_wasm_hash:null});v.all_entries_healthy=false;});
reject('rejects mismatch fabricated TTL',v=>{Object.assign(v.entries[0],{status:'mismatch',observed_wasm_hash:'ab'.repeat(32),ttl_remaining_ledgers:null});v.all_entries_healthy=false;});
reject('rejects fake all healthy',v=>Object.assign(v.entries[0],{status:'unavailable',observed_wasm_hash:null,ttl_remaining_ledgers:null,live_until_ledger:null}));
reject('rejects incorrect unhealthy aggregate',v=>v.all_entries_healthy=false);
for(const key of ['customer_smart_account_factory_deployed','customer_smart_account_created','credential_recovery_verified',
 'privacy_proofs_verified','mainnet_enabled','financial_execution_enabled','operator_managed_deployment']){
 reject(`rejects flipped release flag ${key}`,v=>v[key]=!v[key]);
 reject(`rejects nonboolean release flag ${key}`,v=>v[key]='false');
}
test('rejects nonobjects and malformed containers',()=>{
 for(const v of [null,undefined,[],42,'ready',{...snapshot(),entries:{}},{...snapshot(),entries:Array(7)}])
  assert.equal(validSmartAccountKitSnapshot(v,now),false);
});
test('accepts exact freshness boundaries',()=>{
 for(const time of [now-90,now+30])assert.equal(validSmartAccountKitSnapshot(snapshot(time),now),true);
});
test('client issues bounded uncached GET with request options and no body',async()=>{
 const controller=new AbortController();let request;
 const api=new StealthBridgeClient({apiBaseUrl:'/api/bridge',network:'testnet',fetchImpl:async(url,init)=>{
  request={url,init};return Response.json(snapshot(Math.floor(Date.now()/1000)));
 }});
 const v=await api.smartAccountKit({signal:controller.signal,retries:0});
 assert.equal(v.all_entries_healthy,true);assert.equal(request.url,'/api/bridge/v1/wallet/smart-account-kit');
 assert.equal(request.init.method,'GET');assert.equal(request.init.cache,'no-store');assert.equal(request.init.body,undefined);
 assert.ok(request.init.signal instanceof AbortSignal);
 for(const name of ['deploySmartAccount','createSmartAccount','signSmartAccount','enablePayments'])assert.equal(name in api,false);
});
test('client rejects forged or stale payload as upstream protocol failure',async()=>{
 for(const payload of [snapshot(now),{...snapshot(Math.floor(Date.now()/1000)),financial_execution_enabled:true}]){
  const api=new StealthBridgeClient({apiBaseUrl:'/api/bridge',network:'testnet',fetchImpl:async()=>Response.json(payload)});
  await assert.rejects(api.smartAccountKit(),error=>error instanceof ApiError&&error.status===502);
 }
});
test('client preserves backend unavailable errors and aborts before transport',async()=>{
 let calls=0;
 const api=new StealthBridgeClient({apiBaseUrl:'/api/bridge',network:'testnet',fetchImpl:async()=>{calls++;return new Response(null,{status:503});}});
 await assert.rejects(api.smartAccountKit(),error=>error instanceof ApiError&&error.status===503);
 const controller=new AbortController();controller.abort();
 await assert.rejects(api.smartAccountKit({signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});
test('pinned OpenAPI and generated models describe only the public GET',async()=>{
 const yaml=await readFile(new URL('../specs/backend-openapi.v0.3.yaml',import.meta.url),'utf8');
 const route=yaml.split('  /v1/wallet/smart-account-kit:\n')[1]?.split('\n  /')[0]??'';
 assert.match(route,/^    get:$/m);assert.doesNotMatch(route,/^    (post|put|delete|patch):$/m);
 assert.match(route,/SmartAccountKitObservation/);
 const model=await readFile(new URL('../src/generated/api-wire.ts',import.meta.url),'utf8');
 assert.match(model,/schema_version: 1;/);assert.match(model,/kit_version: "0.10.0";/);
 assert.match(model,/ttl_remaining_ledgers: number \| null;/);
 assert.match(model,/financial_execution_enabled: false;/);
});
test('exact schema parity comparison catches missing blocks and contract drift',async()=>{
 const {smartAccountKitContract}=await import('../scripts/check-smart-account-kit-schema.mjs');
 const yaml=await readFile(new URL('../specs/backend-openapi.v0.3.yaml',import.meta.url),'utf8');
 assert.equal(smartAccountKitContract(yaml),smartAccountKitContract(yaml+'\n'));
 assert.throws(()=>smartAccountKitContract(yaml.replace('    SmartAccountKitEntry:','    MissingEntry:')),/Missing or duplicate/);
 assert.notEqual(smartAccountKitContract(yaml),smartAccountKitContract(yaml.replace('const: 0.10.0','const: 0.11.0')));
});

test('accepts known pinned hash with unavailable TTL without claiming health',()=>{
 const v=snapshot();Object.assign(v.entries[0],{status:'unavailable',live_until_ledger:null,ttl_remaining_ledgers:null});
 v.all_entries_healthy=false;assert.equal(validSmartAccountKitSnapshot(v,now),true);
});
reject('rejects unavailable status hiding hash drift',v=>{
 Object.assign(v.entries[0],{status:'unavailable',observed_wasm_hash:'ab'.repeat(32),live_until_ledger:null,ttl_remaining_ledgers:null});
 v.all_entries_healthy=false;
});
reject('rejects out-of-range backend ledger',v=>v.observed_ledger_sequence=4294967296);
