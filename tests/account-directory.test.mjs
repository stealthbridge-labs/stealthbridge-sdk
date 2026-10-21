import {test} from "node:test";
import assert from "node:assert/strict";
import {validAccountDirectory,readAccountDirectory} from "../dist/index.js";
const G="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const A={schema_version:1,network:"testnet",source:"neon-active-memberships",
 account_address:G,organizations:[{id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 display_name:"CI ONLY Org",role:"viewer"}],has_more:false,
 payment_execution_enabled:false,organization_payment_authorized:false};
test("SDK strictly validates authenticated identity and non-financial real memberships",()=>{
 assert.equal(validAccountDirectory(A,G),true);
 for(const value of [
  {...A,account_address:"GBAD"}, {...A,network:"mainnet"},
  {...A,payment_execution_enabled:true},
  {...A,organization_payment_authorized:true},
  {...A,source:"marketing-fixtures"},
  {...A,organizations:[{...A.organizations[0],role:"superuser"}]},
  {...A,organizations:[{...A.organizations[0],display_name:"  Untrimmed"}]},
  {...A,organizations:[A.organizations[0],A.organizations[0]]},
  {...A,organizations:[{...A.organizations[0],bank_balance:"100000"}]},
  {...A,session_secret:"leak"}
 ]) assert.equal(validAccountDirectory(value,G),false);
 assert.equal(validAccountDirectory(A,"G".repeat(56)),false);
 assert.equal(validAccountDirectory({...A,organizations:[]},G),true);
});
test("SDK account directory is a same-origin signed-session GET, never a signer",async()=>{
 const calls=[];
 const got=await readAccountDirectory(G,{fetchImpl:async(path,options)=>{
  calls.push({path,method:options.method,credentials:options.credentials});
  return new Response(JSON.stringify(A),{status:200,headers:{"content-type":"application/json"}});
 }});
 assert.deepEqual(got,A);
 assert.deepEqual(calls,[{path:"/api/account/directory",method:"GET",credentials:"same-origin"}]);
 await assert.rejects(()=>readAccountDirectory("G".repeat(56)),TypeError);
 await assert.rejects(()=>readAccountDirectory(G,{fetchImpl:async()=>new Response("",{status:401})}),/unavailable/);
 await assert.rejects(()=>readAccountDirectory(G,{fetchImpl:async()=>new Response(JSON.stringify({...A,organization_payment_authorized:true}))}),/Unverified/);
});
