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

test("pending application lifecycle validates write methods and backend receipts",async()=>{
 const {amendBusinessApplication,withdrawBusinessApplication}=await import("../dist/index.js");
 const calls=[];
 const fetchImpl=async (url,options)=>{
  calls.push([url,options.method,options.credentials,JSON.parse(options.body)]);
  return new Response(JSON.stringify({...packet,applications:options.method==="PATCH"?
   [{...item,display_name:"Corrected Importer Ltd"}]:[]}),{status:200});
 };
 const edited=await amendBusinessApplication(account,item.id,item.display_name,
  "Corrected Importer Ltd",{fetchImpl});
 assert.equal(edited.applications[0].display_name,"Corrected Importer Ltd");
 const withdrawn=await withdrawBusinessApplication(account,item.id,
  "Corrected Importer Ltd",{fetchImpl});
 assert.equal(withdrawn.applications.length,0);
 assert.deepEqual(calls,[
  ["/api/account/business-onboarding","PATCH","same-origin",
   {organization_id:item.id,expected_display_name:item.display_name,
    display_name:"Corrected Importer Ltd"}],
  ["/api/account/business-onboarding","DELETE","same-origin",
   {organization_id:item.id,confirm_display_name:"Corrected Importer Ltd"}]
 ]);
 await assert.rejects(()=>amendBusinessApplication(account,item.id,"same","same",{fetchImpl}),TypeError);
 await assert.rejects(()=>withdrawBusinessApplication(account,"../../bad","name",{fetchImpl}),TypeError);
 const forgery=async()=>new Response(JSON.stringify({
  ...packet,organization_payment_authorized:true
 }),{status:200});
 await assert.rejects(()=>amendBusinessApplication(account,item.id,
  "Old","Corrected Importer Ltd",{fetchImpl:forgery}),/could not be verified/);
 await assert.rejects(()=>withdrawBusinessApplication(account,item.id,
  "Corrected Importer Ltd",{fetchImpl:forgery}),/could not be verified/);
});
