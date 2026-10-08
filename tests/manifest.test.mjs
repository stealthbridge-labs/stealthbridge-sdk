import {test} from "node:test";
import assert from "node:assert/strict";
import {ManifestError,parseDeploymentManifest,getVerifiedContract} from "../dist/index.js";

const currentManifest={schemaVersion:1,network:"testnet",status:"not-deployed",verified:false,
 contractAddresses:{},assetIssuers:{},txHashes:[],
 notes:"No contract deployments or proof verifications claimed. Populate only after a reproducible testnet deployment."};
const completeManifest={
 schemaVersion:2,network:"testnet",networkPassphrase:"Test SDF Network ; September 2015",
 status:"deployed",verified:true,protocolVersion:1,apiVersion:1,sourceRevision:"a".repeat(40),
 contractAddresses:{"corridor-registry":"C"+"A".repeat(55)},
 abiDigests:{"corridor-registry":"b".repeat(64)},
 wasmDigests:{"corridor-registry":"c".repeat(64)},assetIssuers:{},txHashes:["d".repeat(64)]
};

test("accepts the canonical empty schema-v1 manifest without enabling contracts",()=>{
 const manifest=parseDeploymentManifest(currentManifest);
 assert.equal(manifest.status,"not-deployed");
 assert.equal(manifest.verified,false);
 assert.deepEqual(manifest.contractAddresses,{});
 assert.throws(()=>getVerifiedContract(manifest,"corridor-registry"),ManifestError);
});

test("accepts a complete isolated schema-v2 fixture but still requires chain attestation",()=>{
 const manifest=parseDeploymentManifest(completeManifest);
 assert.equal(manifest.schemaVersion,2);
 assert.equal(manifest.sourceRevision,"a".repeat(40));
 assert.equal(manifest.abiDigests["corridor-registry"],"b".repeat(64));
 assert.throws(()=>getVerifiedContract(manifest,"corridor-registry"),/attestation/);
 assert.throws(()=>getVerifiedContract(manifest,"corridor-registry",{sourceRevision:"e".repeat(40)}),/source revision/);
 assert.throws(()=>getVerifiedContract(manifest,"corridor-registry",{networkPassphrase:"Public Global Stellar Network ; September 2015"}),/passphrase/);
 assert.throws(()=>getVerifiedContract(manifest,"corridor-registry",{apiVersion:2}),/version/);
});

test("rejects wrong network identity, malformed IDs and unsupported versions",()=>{
 const invalid=[
  {...currentManifest,network:"public"},
  {...completeManifest,networkPassphrase:"Public Global Stellar Network ; September 2015"},
  {...completeManifest,contractAddresses:{"corridor-registry":"not-a-contract"}},
  {...completeManifest,sourceRevision:"not-a-revision"},
  {...completeManifest,protocolVersion:2},
  {...completeManifest,apiVersion:2},
  {...completeManifest,schemaVersion:3},
 ];
 for(const value of invalid)assert.throws(()=>parseDeploymentManifest(value),ManifestError);
});

test("rejects bad digests, missing IDs and mismatched artifact names",()=>{
 assert.throws(()=>parseDeploymentManifest({...completeManifest,abiDigests:{"corridor-registry":"bad"}}),ManifestError);
 assert.throws(()=>parseDeploymentManifest({...completeManifest,contractAddresses:{}}),ManifestError);
 assert.throws(()=>parseDeploymentManifest({...completeManifest,wasmDigests:{other:"c".repeat(64)}}),ManifestError);
});

test("undeployed manifests cannot include verified IDs, issuers or transaction evidence",()=>{
 assert.throws(()=>parseDeploymentManifest({...currentManifest,verified:true}),ManifestError);
 assert.throws(()=>parseDeploymentManifest({...currentManifest,contractAddresses:{registry:"C"+"A".repeat(55)}}),ManifestError);
 assert.throws(()=>parseDeploymentManifest({...currentManifest,assetIssuers:{issuer:"G"+"A".repeat(55)}}),ManifestError);
 assert.throws(()=>parseDeploymentManifest({...currentManifest,txHashes:["f".repeat(64)]}),ManifestError);
});
