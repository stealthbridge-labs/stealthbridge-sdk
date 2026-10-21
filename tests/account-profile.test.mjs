import {test} from "node:test";
import assert from "node:assert/strict";
import {validProfilePreferences,validAccountProfileEnvelope,
 readCustomerProfile,saveCustomerPreferences} from "../dist/index.js";
const address="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const prefs={display_name:"StealthBridge User",use_case:"both",residence_country:"NG"};
const envelope={schema_version:1,network:"testnet",source:"neon-customer-profiles",
 account_address:address,profile:{...prefs,updated_at_unix:1800000000},
 payment_execution_enabled:false,organization_payment_authorized:false};
test("account profile is strict, account-bound, voluntary and never KYC",()=>{
 assert.equal(validProfilePreferences(prefs),true);
 assert.equal(validAccountProfileEnvelope(envelope,address),true);
 assert.equal(validAccountProfileEnvelope({...envelope,profile:null},address),true);
 for(const input of [
  {...prefs,kyc_verified:true}, {...prefs,display_name:" <script> "},
  {...prefs,display_name:""}, {...prefs,residence_country:"NGA"},
  {...prefs,use_case:"verified-business"}
 ]) assert.equal(validProfilePreferences(input),false);
 for(const candidate of [
  {...envelope,payment_execution_enabled:true},
  {...envelope,organization_payment_authorized:true},
  {...envelope,account_address:"G".repeat(56)},
  {...envelope,profile:{...prefs,updated_at_unix:0}},
  {...envelope,profile:{...prefs,updated_at_unix:1800000000,bank_balance:"100"}}
 ]) assert.equal(validAccountProfileEnvelope(candidate,address),false);
});
test("reads and saves only browser-local preferences through authenticated BFF",async()=>{
 const calls=[];
 const fake=async(url,init)=>{
  calls.push({url,method:init.method,body:init.body,credentials:init.credentials});
  return new Response(JSON.stringify(envelope),{status:200,headers:{"content-type":"application/json"}});
 };
 const current=await readCustomerProfile(address,{fetchImpl:fake});
 assert.equal(current.profile.display_name,prefs.display_name);
 const updated=await saveCustomerPreferences(address,prefs,{fetchImpl:fake});
 assert.equal(updated.profile.use_case,"both");
 assert.deepEqual(calls.map(v=>[v.url,v.method,v.credentials]),[
  ["/api/account/profile","GET","same-origin"],
  ["/api/account/profile","PATCH","same-origin"]
 ]);
 assert.deepEqual(JSON.parse(calls[1].body),prefs);
 await assert.rejects(()=>saveCustomerPreferences(address,{...prefs,kyc_verified:true},{fetchImpl:fake}),TypeError);
 await assert.rejects(()=>readCustomerProfile("G".repeat(56),{fetchImpl:fake}),TypeError);
});
