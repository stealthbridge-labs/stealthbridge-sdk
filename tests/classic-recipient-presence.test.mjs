import {test} from "node:test";
import assert from "node:assert/strict";
import {validClassicRecipientPresence,currentClassicRecipient,StealthBridgeClient} from "../dist/index.js";
const address="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const now=1800000000;
const record={schema_version:1,network:"testnet",source:"stellar-horizon/account-presence",
 address,observed_at_unix:now,classic_account_found:true,ownership_verified:false,
 asset_acceptance_verified:false,payment_execution_enabled:false};
test("classic account evidence must be exact, fresh and ownership-neutral",()=>{
 assert.equal(validClassicRecipientPresence(record,address,now),true);
 assert.equal(currentClassicRecipient(record,address,now),true);
 for(const forged of [
  {...record,address:"other"},{...record,observed_at_unix:now-91},
  {...record,observed_at_unix:now+31},{...record,network:"mainnet"},
  {...record,source:"stellar-horizon/other"},
  {...record,ownership_verified:true},{...record,asset_acceptance_verified:true},
  {...record,payment_execution_enabled:true},
  {...record,balances:[{amount:"1"}]},{...record,classic_account_found:"true"}
 ])assert.equal(validClassicRecipientPresence(forged,address,now),false);
 assert.equal(currentClassicRecipient({...record,classic_account_found:false},address,now),false);
});
test("SDK classic recipient read cannot submit transfers or follow arbitrary URLs",async()=>{
 let sent="";
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async(url)=>{sent=String(url);return new Response(JSON.stringify({
   ...record,observed_at_unix:Math.floor(Date.now()/1000)}),
   {headers:{"content-type":"application/json"}})}});
 const output=await client.classicRecipientPresence(address);
 assert.equal(output.asset_acceptance_verified,false);
 assert.equal(sent,"/api/bridge/v1/wallet/classic-recipient/"+address);
 assert.throws(()=>client.classicRecipientPresence("not-G"),TypeError);
});
