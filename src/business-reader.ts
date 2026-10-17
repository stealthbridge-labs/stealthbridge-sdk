/** Read-only authenticated business-review observations.
 * Caller supplies a short-lived organization session for EACH request; this SDK
 * never stores tokens, logs them, signs payments or forwards them elsewhere.
 */
export interface BusinessReviewStatus {
  organization: string;
  request_id: string;
  review_count: number;
  remaining_reviewers: number;
  review_count_met: boolean;
  financial_execution_authorized: false;
  signatures_verified: false;
  source: "tenant-review-journal";
}
export interface ReviewReadOptions {
  apiBaseUrl: string;
  network: "testnet";
  organization: string;
  requestId: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}
const ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const SESSION=/^v1\.[0-9a-f]{100,1800}\.[0-9a-f]{64}$/;
function object(value: unknown): value is Record<string,unknown> {
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
/** Reject inflated claims, cross-tenant replay, invented reviewer counts. */
export function validBusinessReviewStatus(
  input:unknown,organization:string,requestId:string,
):input is BusinessReviewStatus {
  if(!object(input)||input.organization!==organization||input.request_id!==requestId||
    input.financial_execution_authorized!==false||input.signatures_verified!==false||
    input.source!=="tenant-review-journal"||
    !Number.isSafeInteger(input.review_count)||!Number.isSafeInteger(input.remaining_reviewers)||
    typeof input.review_count!=="number"||typeof input.remaining_reviewers!=="number"||
    input.review_count<0||input.review_count>4||
    input.remaining_reviewers<0||input.remaining_reviewers>4||
    input.review_count+input.remaining_reviewers<2||
    input.review_count+input.remaining_reviewers>4||
    typeof input.review_count_met!=="boolean")return false;
  return input.review_count_met===(input.remaining_reviewers===0);
}
export async function readBusinessReviewStatus(options:ReviewReadOptions):Promise<BusinessReviewStatus>{
  if(options.network!=="testnet"||!ID.test(options.organization)||!ID.test(options.requestId)||
    !SESSION.test(options.bearerToken)||options.bearerToken.length>2048)
    throw new TypeError("Invalid Testnet organization review read request");
  const base=new URL(options.apiBaseUrl);
  if((base.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(base.hostname))||
    base.username||base.password||base.hash||base.search||
    !["https:","http:"].includes(base.protocol))
    throw new TypeError("Business review API requires trusted HTTPS without credentials");
  const url=base.toString().replace(/\/$/,"")+
    "/v1/business/reviews/"+options.organization+"/"+options.requestId;
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(10_000)]):
    AbortSignal.timeout(10_000);
  const response=await (options.fetchImpl??fetch)(url,{
    method:"GET",headers:{
      "accept":"application/json","authorization":"Bearer "+options.bearerToken,
    },redirect:"error",credentials:"omit",cache:"no-store",signal,
  });
  // Never parse or echo an upstream error body: it may contain secrets.
  if(!response.ok)throw new Error("Authenticated review status is unavailable");
  if(!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Invalid business review response");
  if(Number(response.headers.get("content-length")??0)>8192)
    throw new Error("Business review response exceeded size budget");
  const reader=response.body?.getReader();
  if(!reader)throw new Error("Empty business review response");
  let chunks:Uint8Array[]=[];
  let size=0;
  try {
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>8192)throw new Error("Business review response exceeded size budget");
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  chunks=[];
  let data:unknown;
  try{data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{throw new Error("Invalid business review response");}
  if(!validBusinessReviewStatus(data,options.organization,options.requestId))
    throw new Error("Unverified business review claims rejected");
  return data;
}
