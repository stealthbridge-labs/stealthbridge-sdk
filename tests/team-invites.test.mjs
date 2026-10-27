import {test} from "node:test";
import assert from "node:assert/strict";
import {
 validTeamInvitationDirectory,validTeamInviteAction,
 loadTeamInvitations,submitTeamInviteAction
} from "../dist/index.js";

const signer="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const peer="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const org="9a1a395f-249c-4907-b657-d48df4b38d28";
const invitation="b3a295f4-0a37-4da4-94c2-38f2f0ee5729";
const row={id:invitation,organization_id:org,organization_name:"CI Verified Wire",
 peer_address:peer,role:"viewer",status:"pending",
 created_at_unix:1800000000,expires_at_unix:1800604800};
const data={schema_version:1,network:"testnet",source:"neon-team-invitations",
 account_address:signer,received:[],sent:[row],
 received_more:false,sent_more:false,business_verified:false,
 payment_execution_enabled:false,organization_payment_authorized:false};

test("strict organization invitation response never claims business or financial authority",()=>{
 assert.equal(validTeamInvitationDirectory(data,signer),true);
 for(const broken of [
  {...data,network:"mainnet"},
  {...data,account_address:peer},
  {...data,business_verified:true},
  {...data,payment_execution_enabled:true},
  {...data,organization_payment_authorized:true},
  {...data,sent:[{...row,role:"owner"}]},
  {...data,sent:[{...row,invite_token:"raw-secret"}]},
  {...data,sent:[{...row,status:"verified"}]},
  {...data,sent:[row,row]},
  {...data,received:[{...row,peer_address:peer}],sent:[row]}
 ])assert.equal(validTeamInvitationDirectory(broken,signer),false);
});
test("invitation actions enforce viewer-only role and forbid extra authority fields",()=>{
 assert.equal(validTeamInviteAction({action:"create",organization_id:org,invited_account:peer,role:"viewer"}),true);
 assert.equal(validTeamInviteAction({action:"accept",invitation_id:invitation}),true);
 for(const malformed of [
  {action:"create",organization_id:org,invited_account:peer,role:"admin"},
  {action:"create",organization_id:org,invited_account:peer,role:"viewer",fee_claiming:true},
  {action:"accept",invitation_id:invitation,owner:signer},
  {action:"revoke",invitation_id:"../../admin"}
 ])assert.equal(validTeamInviteAction(malformed),false);
});
test("SDK invitation read/accept is cookie-bound; no actor assertion or signing key",async()=>{
 const actual=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,options)=>{
   calls.push({url,method:options.method,credentials:options.credentials,body:options.body});
   if(options.method==="GET")return new Response(JSON.stringify(data),{status:200});
   return new Response(null,{status:204});
  };
  await assert.rejects(()=>loadTeamInvitations("invalid-account"),TypeError);
  assert.equal(calls.length,0,"invalid identities must not hit the account API");
  assert.equal((await loadTeamInvitations(signer)).sent[0].id,invitation);
  await submitTeamInviteAction({action:"revoke",invitation_id:invitation});
  assert.deepEqual(calls.map(v=>[v.url,v.method,v.credentials]),[
   ["/api/account/team-invites","GET","same-origin"],
   ["/api/account/team-invites","POST","same-origin"]
  ]);
  assert.deepEqual(JSON.parse(calls[1].body),{action:"revoke",invitation_id:invitation});
  await assert.rejects(()=>submitTeamInviteAction({action:"create",organization_id:org,
   invited_account:peer,role:"operator"}),TypeError);
 }finally{globalThis.fetch=actual;}
});
