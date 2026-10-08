/**
 * Read-only contract artifact discovery. A registry status does not establish
 * issuer endorsement, audited privacy or deployment authenticity.
 */
export interface UndeployedManifest {
  schemaVersion:1;
  network:"testnet";
  status:"not-deployed";
  verified:boolean;
  contractAddresses:Record<string,string>;
  assetIssuers:Record<string,string>;
  txHashes:string[];
  notes?:string;
}

/** Full evidence required by the next canonical deployed-manifest schema. */
export interface VersionedDeploymentManifest {
  schemaVersion:2;
  network:"testnet";
  networkPassphrase:"Test SDF Network ; September 2015";
  status:"not-deployed"|"deployed";
  verified:boolean;
  protocolVersion:1;
  apiVersion:1;
  sourceRevision:string;
  contractAddresses:Record<string,string>;
  abiDigests:Record<string,string>;
  wasmDigests:Record<string,string>;
  assetIssuers:Record<string,string>;
  txHashes:string[];
  notes?:string;
}

export type DeploymentManifest=UndeployedManifest|VersionedDeploymentManifest;
export interface ManifestCompatibility {
 sourceRevision?:string;
 networkPassphrase?:string;
 protocolVersion?:number;
 apiVersion?:number;
}

export class ManifestError extends Error {
 constructor(message:string){super(message);this.name="ManifestError";}
}

const hashPattern=/^[0-9a-f]{64}$/i;
const contractPattern=/^C[A-Z2-7]{55}$/;
const issuerPattern=/^G[A-Z2-7]{55}$/;
const namePattern=/^[a-z][a-z0-9-]{0,63}$/;
const sourceRevisionPattern=/^[0-9a-f]{40}$/i;
const TESTNET_PASSPHRASE="Test SDF Network ; September 2015";
const SUPPORTED_PROTOCOL_VERSION=1;
const SUPPORTED_API_VERSION=1;

function isObject(input:unknown):input is Record<string,unknown>{
 return !!input && typeof input==="object" && !Array.isArray(input);
}
function hasOnlyKeys(input:Record<string,unknown>,required:string[],optional:string[]=[]):boolean{
 const allowed=new Set([...required,...optional]);
 return required.every(key=>Object.hasOwn(input,key))&&Object.keys(input).every(key=>allowed.has(key));
}
function validIdentifierMap(input:unknown,pattern:RegExp):input is Record<string,string>{
 return isObject(input)&&Object.entries(input).every(([key,value])=>
   namePattern.test(key)&&typeof value==="string"&&pattern.test(value));
}
function validDigestMap(input:unknown):input is Record<string,string>{
 return validIdentifierMap(input,hashPattern);
}
function freezeMap(input:Record<string,string>):Record<string,string>{
 return Object.freeze({...input});
}

function parseSchemaOne(input:Record<string,unknown>):UndeployedManifest{
 const required=["schemaVersion","network","status","verified","contractAddresses","assetIssuers","txHashes"];
 if(!hasOnlyKeys(input,required,["notes"])||input.network!=="testnet"||
    input.status!=="not-deployed"||
    typeof input.verified!=="boolean"||!validIdentifierMap(input.contractAddresses,contractPattern)||
    !validIdentifierMap(input.assetIssuers,issuerPattern)||!Array.isArray(input.txHashes)||
    !input.txHashes.every(value=>typeof value==="string"&&hashPattern.test(value))||
    (input.notes!==undefined&&typeof input.notes!=="string"))
  throw new ManifestError("Invalid schema-v1 deployment manifest");
 if(input.status==="not-deployed"&&
    (input.verified!==false||Object.keys(input.contractAddresses).length!==0||
     Object.keys(input.assetIssuers).length!==0||input.txHashes.length!==0))
  throw new ManifestError("Undeployed manifest cannot advertise verified contracts or issuers");
 return {
  schemaVersion:1,network:"testnet",status:"not-deployed",
  verified:input.verified,contractAddresses:freezeMap(input.contractAddresses),
  assetIssuers:freezeMap(input.assetIssuers),txHashes:Object.freeze([...input.txHashes]) as string[],
  ...(typeof input.notes==="string"?{notes:input.notes}:{})
 };
}

function parseSchemaTwo(input:Record<string,unknown>):VersionedDeploymentManifest{
 const required=["schemaVersion","network","networkPassphrase","status","verified","protocolVersion",
  "apiVersion","sourceRevision","contractAddresses","abiDigests","wasmDigests","assetIssuers","txHashes"];
 if(!hasOnlyKeys(input,required,["notes"])||input.network!=="testnet"||
    input.networkPassphrase!==TESTNET_PASSPHRASE||
    !["not-deployed","deployed"].includes(String(input.status))||typeof input.verified!=="boolean"||
    input.protocolVersion!==SUPPORTED_PROTOCOL_VERSION||input.apiVersion!==SUPPORTED_API_VERSION||
    typeof input.sourceRevision!=="string"||!sourceRevisionPattern.test(input.sourceRevision)||
    !validIdentifierMap(input.contractAddresses,contractPattern)||!validDigestMap(input.abiDigests)||
    !validDigestMap(input.wasmDigests)||!validIdentifierMap(input.assetIssuers,issuerPattern)||
    !Array.isArray(input.txHashes)||!input.txHashes.every(value=>typeof value==="string"&&hashPattern.test(value))||
    (input.notes!==undefined&&typeof input.notes!=="string"))
  throw new ManifestError("Invalid, incompatible, or unsupported schema-v2 deployment manifest");

 const contracts=Object.keys(input.contractAddresses);
 const abiNames=Object.keys(input.abiDigests);
 const wasmNames=Object.keys(input.wasmDigests);
 if(contracts.sort().join(",")!==abiNames.sort().join(",")||
    contracts.sort().join(",")!==wasmNames.sort().join(","))
  throw new ManifestError("Every contract ID must have matching ABI and WASM digests");
 if(input.status==="not-deployed"&&
    (input.verified!==false||contracts.length!==0||Object.keys(input.assetIssuers).length!==0||input.txHashes.length!==0))
  throw new ManifestError("Undeployed manifest cannot advertise verified contracts or issuers");
 if(input.status==="deployed"&&(!input.verified||!contracts.length||!input.txHashes.length))
  throw new ManifestError("Deployed manifest requires contract IDs, digests, source revision, and verification evidence");

 return {
  schemaVersion:2,network:"testnet",networkPassphrase:TESTNET_PASSPHRASE,
  status:input.status as VersionedDeploymentManifest["status"],verified:input.verified,
  protocolVersion:SUPPORTED_PROTOCOL_VERSION,apiVersion:SUPPORTED_API_VERSION,
  sourceRevision:input.sourceRevision.toLowerCase(),contractAddresses:freezeMap(input.contractAddresses),
  abiDigests:freezeMap(input.abiDigests),wasmDigests:freezeMap(input.wasmDigests),
  assetIssuers:freezeMap(input.assetIssuers),txHashes:Object.freeze([...input.txHashes]) as string[],
  ...(typeof input.notes==="string"?{notes:input.notes}:{})
 };
}

/** Parse only known manifest versions and reject partial or contradictory claims. */
export function parseDeploymentManifest(input:unknown):DeploymentManifest {
 if(!isObject(input))throw new ManifestError("Expected manifest object");
 if(input.schemaVersion===1)return parseSchemaOne(input);
 if(input.schemaVersion===2)return parseSchemaTwo(input);
 throw new ManifestError("Unsupported deployment manifest schema version");
}

/**
 * This local manifest cannot attest to chain state. Even a complete, verified
 * artifact remains unavailable until a trusted Stellar RPC check is provided.
 */
export function getVerifiedContract(manifest:DeploymentManifest,name:string,expected:ManifestCompatibility={}):string {
 if(manifest.status!=="deployed"||!manifest.verified)
  throw new ManifestError("Contract not independently verified as deployed");
 if(!manifest.contractAddresses[name])
  throw new ManifestError("No declared contract for requested name");
 if(manifest.schemaVersion!==2)
  throw new ManifestError("A deployed contract requires the complete schema-v2 artifact");
 const expectedPassphrase=expected.networkPassphrase??TESTNET_PASSPHRASE;
 const expectedProtocol=expected.protocolVersion??SUPPORTED_PROTOCOL_VERSION;
 const expectedApi=expected.apiVersion??SUPPORTED_API_VERSION;
 if(manifest.networkPassphrase!==expectedPassphrase)
  throw new ManifestError("Contract manifest network passphrase does not match the requested network");
 if(manifest.protocolVersion!==expectedProtocol||manifest.apiVersion!==expectedApi)
  throw new ManifestError("Contract protocol or API version is incompatible with this consumer");
 if(expected.sourceRevision!==undefined&&manifest.sourceRevision!==expected.sourceRevision.toLowerCase())
  throw new ManifestError("Contract source revision does not match the pinned canonical release");
 throw new ManifestError("On-chain contract attestation is required before resolving any address");
}
