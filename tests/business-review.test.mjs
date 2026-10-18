import test from "node:test";
import assert from "node:assert/strict";
import {assessBusinessReview,BusinessReviewError} from "../dist/index.js";
const org="a12ef783-d60b-4427-aa62-d2562acd4cef";
const now=1_800_000_000;
const policy=()=>({organization:org,initiator:"GMAKER0001",intentSha256:"d".repeat(64),
 requiredReviewers:2,issuedAtUnix:now-100,expiresAtUnix:now+500});
const records=()=>[
 {organization:org,reviewer:"GREVIEWER01",role:"approver",recordedAtUnix:now-10},
 {organization:org,reviewer:"GREVIEWER02",role:"admin",recordedAtUnix:now-9},
];
test("two distinct reviewers meet a count but never authorize financial execution",()=>{
 const complete=assessBusinessReview(policy(),records(),now);
 assert.equal(complete.reviewCountMet,true);
 assert.equal(complete.remainingReviewers,0);
 assert.equal(complete.financialExecutionAuthorized,false);
 const partial=assessBusinessReview(policy(),records().slice(0,1),now);
 assert.equal(partial.remainingReviewers,1);
 assert.equal(partial.financialExecutionAuthorized,false);
});
test("wrong organization, self approvals, duplicates and false roles fail closed",()=>{
 const variants=[
  [v=>v[0].organization="b12ef783-d60b-4427-aa62-d2562acd4cef","WRONG_ORGANIZATION"],
  [v=>v[0].reviewer="GMAKER0001","SAME_INITIATOR"],
  [v=>v[0].reviewer="GREVIEWER02","DUPLICATE_REVIEWER"],
  [v=>v[0].role="operator","FORBIDDEN_ROLE"],
  [v=>v[0].recordedAtUnix=now+1,"INVALID_RECORD"],
 ];
 for(const [mutate,code] of variants){
  const v=records();mutate(v);
  assert.throws(()=>assessBusinessReview(policy(),v,now),e=>e instanceof BusinessReviewError&&e.code===code);
 }
});
test("expired, oversized or missing canonical digest policy fails",()=>{
 assert.throws(()=>assessBusinessReview(policy(),records(),now+600),e=>e.code==="EXPIRED");
 const large=policy();large.requiredReviewers=20;
 assert.throws(()=>assessBusinessReview(large,records(),now),e=>e.code==="INVALID_POLICY");
 const empty=policy();empty.intentSha256="0".repeat(64);
 assert.throws(()=>assessBusinessReview(empty,records(),now),e=>e.code==="INVALID_POLICY");
 assert.throws(()=>assessBusinessReview(policy(),Array(9).fill(records()[0]),now),e=>e.code==="TOO_MANY_RECORDS");
});
