import test from "node:test";
import assert from "node:assert/strict";
import {readBusinessReviewStatus,validBusinessReviewStatus} from "../dist/index.js";
const org="a12ef783-d60b-4427-aa62-d2562acd4cef";
const id="f22ef783-d60b-4427-aa62-d2562acd4cef";
const bearer="v1."+"ab".repeat(180)+"."+"ff".repeat(32);
const payload=()=>({
 organization:org,request_id:id,review_count:1,remaining_reviewers:1,
 review_count_met:false,financial_execution_authorized:false,
 signatures_verified:false,source:"tenant-review-journal",
});
test("read-only authenticated status binds tenant identity and does not store tokens",async()=>{
 const calls=[];
 const result=await readBusinessReviewStatus({
  apiBaseUrl:"https://example.test/api",network:"testnet",
  organization:org,requestId:id,bearerToken:bearer,
  fetchImpl:async(url,options)=>{
   calls.push({url,method:options.method,token:options.headers.authorization,
     redirect:options.redirect,credentials:options.credentials,cache:options.cache});
   return new Response(JSON.stringify(payload()),{status:200,headers:{"content-type":"application/json"}});
  }
 });
 assert.deepEqual(result,payload());
 assert.equal(calls.length,1);
 assert.equal(calls[0].method,"GET");
 assert.equal(calls[0].url,"https://example.test/api/v1/business/reviews/"+org+"/"+id);
 assert.equal(calls[0].token,"Bearer "+bearer);
 assert.equal(calls[0].redirect,"error");
 assert.equal(calls[0].credentials,"omit");
 assert.equal(calls[0].cache,"no-store");
});
test("forged approval, signatures or organization values cannot be accepted",async()=>{
 for(const mutation of [
  v=>{v.financial_execution_authorized=true;},
  v=>{v.signatures_verified=true;},
  v=>{v.organization="b12ef783-d60b-4427-aa62-d2562acd4cef";},
  v=>{v.request_id="b22ef783-d60b-4427-aa62-d2562acd4cef";},
  v=>{v.review_count_met=true;},
  v=>{v.remaining_reviewers=8;},
  v=>{v.source="public-chain";},
 ]){
  const body=payload();mutation(body);
  assert.equal(validBusinessReviewStatus(body,org,id),false);
  await assert.rejects(readBusinessReviewStatus({
   apiBaseUrl:"https://example.test",network:"testnet",
   organization:org,requestId:id,bearerToken:bearer,
   fetchImpl:async()=>new Response(JSON.stringify(body),{headers:{"content-type":"application/json"}}),
  }),/Unverified business review claims rejected/);
 }
});
test("invalid URLs, bearer tokens, and non-Testnet requests reject before transport",async()=>{
 for(const change of [
  {apiBaseUrl:"http://insecure.example"},
  {apiBaseUrl:"https://user:pass@example.test"},
  {organization:"../../other"},
  {bearerToken:"Bearer unauthorized"},
  {network:"mainnet"},
 ]){
  let called=false;
  await assert.rejects(readBusinessReviewStatus({
    apiBaseUrl:"https://example.test",network:"testnet",
    organization:org,requestId:id,bearerToken:bearer,...change,
    fetchImpl:async()=>{called=true;throw new Error("must not reach network");},
  }),/Invalid Testnet|trusted HTTPS/);
  assert.equal(called,false);
 }
});
test("oversized streaming response is blocked",async()=>{
 await assert.rejects(readBusinessReviewStatus({
  apiBaseUrl:"https://example.test",network:"testnet",
  organization:org,requestId:id,bearerToken:bearer,
  fetchImpl:async()=>new Response(JSON.stringify({data:"x".repeat(9000)}),{
    headers:{"content-type":"application/json"}}),
 }),/size budget/);
});
