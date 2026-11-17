import type {ApiSmartAccountKitObservation} from "./generated/api-wire.js";

/** Public upstream v0.10.0 artifacts, pinned at
 * stellar/smart-account-kit 768ac041dad01b94a750b768fc650e67930afd28.
 * These observations establish neither customer custody nor authorization.
 */
const account="c514d35ea67eaea9bfc1fb3327854c0c06111bc1ddebd4fe217c504c1004b9e1";
const webauthn="e63a030d0f1a1481e36059a4837c433083b33e704c1f9625b7314795b6d72b76";
const threshold="f72a11de6e2d5d2495d98fe61e04cd13544e64156a5a3be83ef8c2e403d14a94";
const spendingLimit="9bc17db0a804d6c82231a268c43bac1413650ea92cac0022e0d0a3b66ddc8189";
const pins=[
 ["account_code","code",account],
 ["webauthn_instance","instance",webauthn],
 ["webauthn_code","code",webauthn],
 ["threshold_instance","instance",threshold],
 ["threshold_code","code",threshold],
 ["spendingLimit_instance","instance",spendingLimit],
 ["spendingLimit_code","code",spendingLimit],
] as const;
export type SmartAccountKitEntryName=typeof pins[number][0];
type Identity<P extends typeof pins[number]>=P extends typeof pins[number]
 ? {name:P[0];kind:P[1];expected_wasm_hash:P[2]} : never;
/** Status discriminates available TTL/hash evidence from unavailable records. */
type SmartAccountKitEvidence=(
 | {status:"live"|"low_ttl";observed_wasm_hash:string;live_until_ledger:number;ttl_remaining_ledgers:number}
 | {status:"unavailable";observed_wasm_hash:string|null;live_until_ledger:null;ttl_remaining_ledgers:null}
 | {status:"mismatch";observed_wasm_hash:string;live_until_ledger:number|null;ttl_remaining_ledgers:number|null}
);
export type SmartAccountKitEntry=Identity<typeof pins[number]> & SmartAccountKitEvidence;
type Entries<P extends readonly (typeof pins[number])[]>={
 -readonly [I in keyof P]:Identity<P[I]> & SmartAccountKitEvidence;
};
export interface SmartAccountKitSnapshot extends ApiSmartAccountKitObservation {
 entries:Entries<typeof pins>;
}
const flags=["customer_smart_account_factory_deployed","customer_smart_account_created",
 "credential_recovery_verified","privacy_proofs_verified","mainnet_enabled",
 "financial_execution_enabled"] as const;
const keys=["schema_version","network","source","kit_version","observed_at_unix",
 "observed_ledger_sequence","entries","all_entries_healthy",...flags,"operator_managed_deployment"];
const entryKeys=["name","kind","expected_wasm_hash","observed_wasm_hash","status",
 "live_until_ledger","ttl_remaining_ledgers"];
function exact(value:unknown,expected:readonly string[]):value is Record<string,unknown>{
 return value!==null&&typeof value==="object"&&!Array.isArray(value)&&
  Reflect.ownKeys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
}
function integer(value:unknown,min:number):value is number{
 return typeof value==="number"&&Number.isSafeInteger(value)&&value>=min;
}
/** Fresh public Testnet health only. Accept observations up to 90 seconds old,
 * with at most 30 seconds of clock skew, matching public wallet observations.
 * Never use all_entries_healthy to authorize deployment or financial execution.
 */
export function validSmartAccountKitSnapshot(
 value:unknown,now=Math.floor(Date.now()/1000)
):value is SmartAccountKitSnapshot{
 if(!integer(now,1)||!exact(value,keys)||value.schema_version!==1||value.network!=="testnet"||
  value.source!=="stellar-rpc/pinned-smart-account-kit"||value.kit_version!=="0.10.0"||
  !integer(value.observed_at_unix,1)||value.observed_at_unix<now-90||value.observed_at_unix>now+30||
  !integer(value.observed_ledger_sequence,1)||value.observed_ledger_sequence>4294967295||flags.some(key=>value[key]!==false)||
  value.operator_managed_deployment!==true||typeof value.all_entries_healthy!=="boolean"||
  !Array.isArray(value.entries)||value.entries.length!==pins.length)return false;
 let healthy=true;
 for(let i=0;i<pins.length;i++){
  const row:unknown=value.entries[i];
  const [name,kind,hash]=pins[i];
  if(!exact(row,entryKeys)||row.name!==name||row.kind!==kind||row.expected_wasm_hash!==hash)return false;
  const observed=row.observed_wasm_hash;
  if(observed!==null&&(typeof observed!=="string"||!/^[a-f0-9]{64}$/.test(observed)))return false;
  const until=row.live_until_ledger,ttl=row.ttl_remaining_ledgers;
  const validTtl=integer(until,value.observed_ledger_sequence)&&until<=4294967295&&integer(ttl,0)&&
   until-value.observed_ledger_sequence===ttl;
  switch(row.status){
   case "unavailable":
    if((observed!==null&&observed!==hash)||until!==null||ttl!==null)return false;
    healthy=false;break;
   case "mismatch":
    if(observed===null||observed===hash||!((until===null&&ttl===null)||validTtl))return false;
    healthy=false;break;
   case "low_ttl":
   case "live":
    if(observed!==hash||!validTtl||typeof ttl!=="number"||
      (row.status==="live"?ttl<=120960:ttl>120960))return false;
    healthy=healthy&&row.status==="live";break;
   default:return false;
  }
 }
 return value.all_entries_healthy===healthy;
}
