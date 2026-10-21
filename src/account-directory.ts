import {canonicalStellarAccountAddress} from "./wallet.js";
export type AccountMemberRole="owner"|"admin"|"operator"|"approver"|"viewer";
export interface AccountOrganization {
 id:string;
 display_name:string;
 role:AccountMemberRole;
}
/** Private signed-in read-only tenant memberships. Never proof of KYC or payment authority. */
export interface AccountDirectory {
 schema_version:1;
 network:"testnet";
 source:"neon-active-memberships";
 account_address:string;
 organizations:AccountOrganization[];
 has_more:boolean;
 payment_execution_enabled:false;
 organization_payment_authorized:false;
}
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const roles=new Set(["owner","admin","operator","approver","viewer"]);
function exactKeys(value:Record<string,unknown>,keys:string[]):boolean{
 return Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
export function validAccountDirectory(value:unknown,address:string):value is AccountDirectory {
 const expected=canonicalStellarAccountAddress(address);
 if(!expected||!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(!exactKeys(v,["schema_version","network","source","account_address",
     "organizations","has_more","payment_execution_enabled","organization_payment_authorized"])
    ||v.schema_version!==1||v.network!=="testnet"||v.source!=="neon-active-memberships"||
    v.account_address!==expected||v.payment_execution_enabled!==false||
    v.organization_payment_authorized!==false||typeof v.has_more!=="boolean"||
    !Array.isArray(v.organizations)||v.organizations.length>25)return false;
 const ids=new Set<string>();
 for(const org of v.organizations){
  if(!org||typeof org!=="object"||Array.isArray(org))return false;
  const row=org as Record<string,unknown>;
  if(!exactKeys(row,["id","display_name","role"])||
   typeof row.id!=="string"||!uuid.test(row.id)||ids.has(row.id)||
   typeof row.display_name!=="string"||row.display_name.trim().length===0||
   row.display_name.length>120||row.display_name!==row.display_name.trim()||
   typeof row.role!=="string"||!roles.has(row.role))return false;
  ids.add(row.id);
 }
 return true;
}

/** Never send a claimed wallet address; session authentication happens on
 * the same-origin Next.js server. Unauthenticated requests fail closed.
 */
export async function readAccountDirectory(
 address:string,
 options:{fetchImpl?:typeof fetch;signal?:AbortSignal}={}
):Promise<AccountDirectory>{
 if(!canonicalStellarAccountAddress(address))throw new TypeError("Invalid Stellar account.");
 const fetcher=options.fetchImpl??fetch;
 const response=await fetcher("/api/account/directory",{
  method:"GET",cache:"no-store",credentials:"same-origin",...(options.signal?{signal:options.signal}:{}),
  headers:{accept:"application/json"}
 });
 if(!response.ok)throw new Error("Private organization directory unavailable.");
 const payload:unknown=await response.json();
 if(!validAccountDirectory(payload,address))throw new Error("Unverified organization directory response.");
 return payload;
}
