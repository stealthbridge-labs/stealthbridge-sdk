import assert from "node:assert/strict";
import {test} from "node:test";
import {readOrganizationTeam,validOrganizationTeamSnapshot} from "../dist/index.js";

const owner="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const other="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const org="9a1a395f-249c-4907-b657-d48df4b38d28";
const member=(address,role)=>({account_address:address,role,joined_at_unix:1800000000});
const data={schema_version:1,network:"testnet",source:"neon-organization-team",
 account_address:owner,organization:{id:org,display_name:"CI Organization",status:"pending",your_role:"owner"},
 members:[member(owner,"owner")],next_cursor:null,business_verified:false,
 invitation_issuance_enabled:false,payment_execution_enabled:false,
 organization_payment_authorized:false};

test("pending business is never a verified organization or an unrestricted team",()=>{
 assert.equal(validOrganizationTeamSnapshot(data,org,owner),true);
 for(const forged of [
  {...data,business_verified:true},
  {...data,invitation_issuance_enabled:true},
  {...data,payment_execution_enabled:true},
  {...data,organization_payment_authorized:true},
  {...data,network:"mainnet"},
  {...data,source:"browser-cache"},
  {...data,account_address:other},
  {...data,organization:{...data.organization,status:"verified"}},
  {...data,organization:{...data.organization,your_role:"admin"}},
  {...data,organization:{...data.organization,id:"9a1a395f-249c-4907-b657-d48df4b38d29"}},
  {...data,members:[member(owner,"owner"),member(other,"admin")]},
  {...data,members:[member(other,"viewer")]},
  {...data,members:[{...member(owner,"owner"),kyc:true}]},
  {...data,actual_exchange_rate:"1.42"}
 ])assert.equal(validOrganizationTeamSnapshot(forged,org,owner),false);
});

test("active owner/team roster must contain checked, sorted, unique member identities",()=>{
 const active={...data,organization:{...data.organization,status:"active"},
  members:[member(other,"viewer"),member(owner,"owner")]};
 assert.equal(validOrganizationTeamSnapshot(active,org,owner),true);
 for(const items of [
  [member(owner,"owner"),member(other,"viewer")],
  [member(other,"viewer"),member(other,"viewer")],
  [member(other,"superadmin"),member(owner,"owner")],
  [member(other,"viewer"),{...member(owner,"owner"),joined_at_unix:0}]
 ])assert.equal(validOrganizationTeamSnapshot({...active,members:items},org,owner),false);
 assert.equal(validOrganizationTeamSnapshot({...active,next_cursor:owner},org,owner),false);
});

test("reads only the same-origin private session endpoint without a signing key or finance data",async()=>{
 const calls=[];
 const fetchImpl=async (path,options)=>{
  calls.push({path,method:options.method,credentials:options.credentials,cache:options.cache});
  return new Response(JSON.stringify(data),{status:200});
 };
 const output=await readOrganizationTeam(owner,org,{fetchImpl});
 assert.equal(output.organization.status,"pending");
 assert.deepEqual(calls,[{path:"/api/account/organizations/"+org+"/team",
  method:"GET",credentials:"same-origin",cache:"no-store"}]);
 await assert.rejects(()=>readOrganizationTeam(other,org,{fetchImpl}),/Unverified/);
 await assert.rejects(()=>readOrganizationTeam(owner,"../../admin",{fetchImpl}),TypeError);
 await assert.rejects(()=>readOrganizationTeam(owner,org,{after:"not-an-address",fetchImpl}),TypeError);
 await assert.rejects(()=>readOrganizationTeam(owner,org,{
  after:owner,fetchImpl
 }),/Unverified or inconsistent/);
});
