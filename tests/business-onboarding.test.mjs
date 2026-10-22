import {test} from "node:test";
import assert from "node:assert/strict";
import {createBusinessApplication,listBusinessApplications,
 validBusinessApplicationName,validBusinessOnboarding} from "../dist/index.js";
const account="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const item={id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 display_name:"Independent Importer Ltd",status:"pending",role:"owner"};
const packet={schema_version:1,network:"testnet",
 source:"neon-pending-business-applications",account_address:account,
 applications:[item],has_more:false,organization_verified:false,
 payment_execution_enabled:false,organization_payment_authorized:false};
test("pending onboarding explicitly rejects false approval, financial authority and forged identities",()=>{
 assert.equal(validBusinessOnboarding(packet,account),true);
 assert.equal(validBusinessOnboarding({...packet,applications:[]},account),true);
 for(const forged of [
  {...packet,network:"mainnet"},
  {...packet,account_address:"G".repeat(56)},
  {...packet,organization_verified:true},
  {...packet,payment_execution_enabled:true},
  {...packet,organization_payment_authorized:true},
  {...packet,applications:[{...item,status:"active"}]},
  {...packet,applications:[{...item,role:"superadmin"}]},
  {...packet,applications:[item,item]},
  {...packet,applications:[{...item,kyc_approved:true}]}
 ])assert.equal(validBusinessOnboarding(forged,account),false);
 assert.equal(validBusinessApplicationName("Acme Nigeria"),true);
 assert.equal(validBusinessApplicationName("<script>"),false);
 assert.equal(validBusinessApplicationName("  Bad"),false);
});
test("customer draft registration never submits wallet or money instructions",async()=>{
 const requests=[];
 const fetchImpl=async (path,opts)=>{
  requests.push({path,method:opts.method,credentials:opts.credentials,body:opts.body});
  return new Response(JSON.stringify(packet),{status:opts.method==="POST"?201:200});
 };
 const get=await listBusinessApplications(account,{fetchImpl});
 assert.equal(get.applications.length,1);
 const made=await createBusinessApplication(account,"Independent Importer Ltd",{fetchImpl});
 assert.equal(made.applications[0].status,"pending");
 assert.deepEqual(requests.map(x=>[x.path,x.method,x.credentials]),[
  ["/api/account/business-onboarding","GET","same-origin"],
  ["/api/account/business-onboarding","POST","same-origin"]
 ]);
 assert.deepEqual(JSON.parse(requests[1].body),{display_name:"Independent Importer Ltd"});
 await assert.rejects(()=>createBusinessApplication(account,"<script>",{fetchImpl}),TypeError);
 await assert.rejects(()=>listBusinessApplications("G".repeat(56),{fetchImpl}),TypeError);
});
