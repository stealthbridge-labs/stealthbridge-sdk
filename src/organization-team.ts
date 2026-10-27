import {canonicalStellarAccountAddress} from "./wallet.js";

export type OrganizationTeamRole="owner"|"admin"|"operator"|"approver"|"viewer";
export type OrganizationTeamMember={
 account_address:string;role:OrganizationTeamRole;joined_at_unix:number
};
export type OrganizationTeamAccount={
 id:string;display_name:string;status:"pending"|"active";your_role:"owner"|"admin"
};
export type OrganizationTeamSnapshot={
 schema_version:1;network:"testnet";source:"neon-organization-team";
 account_address:string;organization:OrganizationTeamAccount;
 members:OrganizationTeamMember[];next_cursor:string|null;
 business_verified:false;invitation_issuance_enabled:boolean;
 payment_execution_enabled:false;organization_payment_authorized:false
};

const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const roles=new Set(["owner","admin","operator","approver","viewer"]);
const exact=(value:Record<string,unknown>,fields:string[])=>
 Object.keys(value).length===fields.length&&fields.every(key=>Object.hasOwn(value,key));
/** A valid roster remains non-financial metadata, NOT legal KYC, payment
 * approval, an invited user, or authority to access a Stellar contract.
 */
export function validOrganizationTeamSnapshot(
 payload:unknown,expectedOrganization:string,expectedAccount:string
):payload is OrganizationTeamSnapshot{
 const account=canonicalStellarAccountAddress(expectedAccount);
 if(!account||!UUID.test(expectedOrganization)||!payload||
  typeof payload!=="object"||Array.isArray(payload))return false;
 const value=payload as Record<string,unknown>;
 if(!exact(value,["schema_version","network","source","account_address","organization",
  "members","next_cursor","business_verified","invitation_issuance_enabled",
  "payment_execution_enabled","organization_payment_authorized"])||
   value.schema_version!==1||value.network!=="testnet"||
   value.source!=="neon-organization-team"||value.account_address!==account||
   value.business_verified!==false||typeof value.invitation_issuance_enabled!=="boolean"||
   value.payment_execution_enabled!==false||value.organization_payment_authorized!==false||
   !Array.isArray(value.members)||value.members.length>25||
   !value.organization||typeof value.organization!=="object"||
   Array.isArray(value.organization))return false;
 const org=value.organization as Record<string,unknown>;
 if(!exact(org,["id","display_name","status","your_role"])||
   org.id!==expectedOrganization||typeof org.display_name!=="string"||
   !org.display_name.trim()||org.display_name.trim()!==org.display_name||
   org.display_name.length>120||
   !["pending","active"].includes(String(org.status))||
   !["owner","admin"].includes(String(org.your_role))||
   org.status==="pending"&&org.your_role!=="owner")return false;
 if(org.status==="pending"&&value.invitation_issuance_enabled!==false)return false;
 const seen=new Set<string>();let last="";
 for(const candidate of value.members){
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))return false;
  const member=candidate as Record<string,unknown>;
  const address=typeof member.account_address==="string"?
   canonicalStellarAccountAddress(member.account_address):null;
  if(!exact(member,["account_address","role","joined_at_unix"])||
   !address||address!==member.account_address||seen.has(address)||address<=last||
   !roles.has(String(member.role))||!Number.isSafeInteger(member.joined_at_unix)||
   Number(member.joined_at_unix)<=0)return false;
  seen.add(address);last=address;
 }
 if(value.next_cursor!==null&&
   (typeof value.next_cursor!=="string"||
    canonicalStellarAccountAddress(value.next_cursor)!==value.next_cursor||
    value.next_cursor!==last||value.members.length!==25))return false;
 if(org.status==="pending"&&
    (value.members.length!==1||value.next_cursor!==null||
     (value.members[0] as Record<string,unknown>).account_address!==account||
     (value.members[0] as Record<string,unknown>).role!=="owner"))return false;
 return true;
}

/** Fetches only with an already authenticated SAME-ORIGIN browser session.
 * No private key, identity assertion or financial transaction is sent.
 */
export async function readOrganizationTeam(
 expectedAccount:string,organization:string,
 options:{fetchImpl?:typeof fetch,signal?:AbortSignal,after?:string}={}
):Promise<OrganizationTeamSnapshot>{
 if(!canonicalStellarAccountAddress(expectedAccount)||!UUID.test(organization)||
  options.after!==undefined&&!canonicalStellarAccountAddress(options.after))
  throw new TypeError("Invalid organization, signer or pagination cursor.");
 const suffix=options.after?"?after="+encodeURIComponent(options.after):"";
 const response=await (options.fetchImpl??fetch)(
  "/api/account/organizations/"+organization+"/team"+suffix,{
   method:"GET",cache:"no-store",credentials:"same-origin",
   headers:{accept:"application/json"},
   ...(options.signal?{signal:options.signal}:{})
  });
 if(!response.ok)throw Error("Organization team information is unavailable.");
 const result:unknown=await response.json();
 if(!validOrganizationTeamSnapshot(result,organization,expectedAccount)||
    options.after&&result.members.some(member=>member.account_address<=options.after!))
  throw Error("Unverified or inconsistent organization team information.");
 return result;
}
