import {test} from "node:test";
import assert from "node:assert/strict";
import {encryptCustomerDraft,decryptCustomerDraft,reencryptCustomerDraft,validCustomerDraft,validEncryptedCustomerDraft,validEncryptedDraftDirectory} from "../dist/index.js";
const account="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const recipient="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const id="a12ef783-d60b-4427-aa62-d2562acd4cef", other="b12ef783-d60b-4427-aa62-d2562acd4cef";
const password="correct-horse-reliable-phrase-only-on-device";
const draft={kind:"business",corridor_id:other,recipient,amount:"145.25",reference:"INVOICE_104"};
test("AES-256-GCM encrypted draft requires password, account and record id",async()=>{
 const a=await encryptCustomerDraft(account,id,password,draft),b=await encryptCustomerDraft(account,id,password,draft);
 assert.ok(validEncryptedCustomerDraft(a));
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);
 assert.deepEqual(await decryptCustomerDraft(account,id,password,a),draft);
 assert.equal(JSON.stringify(a).includes(draft.amount),false);
 assert.equal(JSON.stringify(a).includes(recipient),false);
 await assert.rejects(decryptCustomerDraft(account,id,"wrong-password-long-enough",a));
 await assert.rejects(decryptCustomerDraft(account,other,password,a));
 await assert.rejects(decryptCustomerDraft(recipient,id,password,a));
 await assert.rejects(decryptCustomerDraft(account,id,password,{...a,iv:b.iv}));
 await assert.rejects(decryptCustomerDraft(account,id,password,{...a,ciphertext:b.ciphertext}));
});
test("strict draft and ciphertext schema refuse financial activation claims",async()=>{
 for(const bad of [
  {...draft,amount:"1e8"},{...draft,recipient:"G"+"A".repeat(55)},
  {...draft,reference:"S\npayout:true"},{...draft,compliance_verified:true},
  {...draft,kind:"personal"},{...draft,amount:"0"}])assert.equal(validCustomerDraft(bad),false);
 await assert.rejects(encryptCustomerDraft(account,id,"short",draft),TypeError);
 const value=await encryptCustomerDraft(account,id,password,draft);
 for(const bad of [{...value,iterations:1},{...value,network:"public"},{...value,payment_execution_enabled:true},{...value,salt:"AAAA"}])
  assert.equal(validEncryptedCustomerDraft(bad),false);
 const directory={schema_version:1,network:"testnet",source:"customer-ciphertext-vault",account_address:account,
  payment_execution_enabled:false,plaintext_available_to_server:false,
  drafts:[{id,revision:1,updated_at_unix:1760000000,encrypted:value}]};
 assert.equal(validEncryptedDraftDirectory(directory,account),true);
 assert.equal(validEncryptedDraftDirectory({...directory,payment_execution_enabled:true},account),false);
 assert.equal(validEncryptedDraftDirectory({...directory,drafts:[...directory.drafts,...directory.drafts]},account),false);
 assert.equal(validEncryptedDraftDirectory({...directory,drafts:[{...directory.drafts[0],revision:1000001}]},account),false);
 assert.equal(validEncryptedDraftDirectory({...directory,drafts:[{...directory.drafts[0],updated_at_unix:Math.floor(Date.now()/1000)+1000}]},account),false);
});

test("customer rotates passphrase with independently fresh ciphertext; old secret stops working",async()=>{
 const old=await encryptCustomerDraft(account,id,password,draft);
 const next="new-long-unique-recovery-secret-2026";
 const rotated=await reencryptCustomerDraft(account,id,password,old,id,next);
 assert.notEqual(rotated.salt,old.salt);
 assert.notEqual(rotated.iv,old.iv);
 assert.notEqual(rotated.ciphertext,old.ciphertext);
 assert.deepEqual(await decryptCustomerDraft(account,id,next,rotated),draft);
 await assert.rejects(decryptCustomerDraft(account,id,password,rotated));
 await assert.rejects(reencryptCustomerDraft(account,id,"incorrect-previous-secret",old,id,next));
 await assert.rejects(reencryptCustomerDraft(recipient,id,password,old,id,next));
});
test("encrypted backup recovery rewraps for a new account-scoped slot without server plaintext",async()=>{
 const original=await encryptCustomerDraft(account,id,password,draft);
 const restored=await reencryptCustomerDraft(account,id,password,original,other,password);
 assert.deepEqual(await decryptCustomerDraft(account,other,password,restored),draft);
 await assert.rejects(decryptCustomerDraft(account,id,password,restored));
 await assert.rejects(reencryptCustomerDraft(account,other,password,{...restored,iv:original.iv},other,password));
});
