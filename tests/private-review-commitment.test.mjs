import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,webcrypto} from "node:crypto";
import {canonicalPrivateReviewDraft,digestPrivateReviewDraft,createPrivateReviewReceipt,verifyPrivateReviewReceipt} from "../dist/index.js";
const sender="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const recipient="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const draft=()=>({corridorId:"a12ef783-d60b-4427-aa62-d2562acd4cef",originCountry:"NG",destinationCountry:"GB",
 assetCode:"USDC",assetIssuer:sender,privacyRail:"confidential-token",sender,recipient,amount:"120.50",reference:"INV_248"});
const salt="a1".repeat(32);
test("canonical receipt binds the real corridor, network and all draft fields",async()=>{
 const data=canonicalPrivateReviewDraft(draft());
 assert.ok(data.startsWith("StealthBridge private local review v1\nnetwork:Test SDF Network ; September 2015\n"));
 const expected=createHash("sha256").update("StealthBridge private local review v1 nonce:"+salt+"\n"+data).digest("hex");
 assert.equal(await digestPrivateReviewDraft(draft(),salt),expected);
 assert.equal(expected,"4f1d1a8cbf79a6d8b8d6780034de12339983540d836e9879ce1a3e03bd38f571");
 for(const field of ["corridorId","originCountry","destinationCountry","assetCode","assetIssuer","privacyRail","sender","recipient","amount","reference"]){
  const changes={corridorId:"b12ef783-d60b-4427-aa62-d2562acd4cef",originCountry:"GH",destinationCountry:"FR",
   assetCode:"EURC",assetIssuer:null,privacyRail:"private-payments",sender:recipient,
   recipient:"CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB",amount:"120.51",reference:"INV_249"};
  const changed={...draft(),[field]:changes[field]};
  if(field==="sender")assert.throws(()=>canonicalPrivateReviewDraft(changed));
  else assert.notEqual(await digestPrivateReviewDraft(changed,salt),expected,field);
 }
});
test("rejects forged separators, ambiguous numbers, bad addresses and weak nonces",async()=>{
 for(const patch of [{reference:"X\namount:1"},{amount:"1e6"},{amount:"00.1"},{amount:"0"},
   {recipient:"C"+"A".repeat(55)},{originCountry:"ZZ\n"},{corridorId:"../../bad"}])
  assert.throws(()=>canonicalPrivateReviewDraft({...draft(),...patch}),TypeError);
 for(const nonce of ["00","A1".repeat(32),"g".repeat(64)])
  await assert.rejects(()=>digestPrivateReviewDraft(draft(),nonce),TypeError);
});
test("random nonces vary and any draft edit invalidates local review receipt",async()=>{
 assert.ok(webcrypto.subtle);
 const first=await createPrivateReviewReceipt(draft());
 const second=await createPrivateReviewReceipt(draft());
 assert.notEqual(first.nonceHex,second.nonceHex);
 assert.notEqual(first.commitment,second.commitment);
 assert.equal(await verifyPrivateReviewReceipt(draft(),first),true);
 assert.equal(await verifyPrivateReviewReceipt({...draft(),amount:"120.51"},first),false);
 assert.equal(await verifyPrivateReviewReceipt(draft(),{...first,paymentAuthorized:true}),false);
 assert.equal(first.zkProofVerified,false);
});
