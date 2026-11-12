import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fingerprintInstructionRoute,validPaymentInstructionDirectory,validPaymentInstructionInput,listPaymentInstructions,savePaymentInstruction,cancelPaymentInstruction,encryptCustomerDraft,decryptCustomerDraft} from '../dist/index.js';
const owner='GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX';
const other='GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN';
const id='a12ef783-d60b-4427-aa62-d2562acd4cef';
const cipher={schema_version:1,network:'testnet',cipher:'AES-256-GCM',kdf:'PBKDF2-HMAC-SHA256',iterations:600000,salt:'AAAAAAAAAAAAAAAAAAAAAA',iv:'AAAAAAAAAAAAAAAA',ciphertext:'AAAAAAAAAAAAAAAAAAAAAAAA'};
const now=()=>Math.floor(Date.now()/1000);
const directory=()=>({schema_version:1,network:'testnet',source:'customer-payment-instructions',account_address:owner,observed_at_unix:now(),items:[{id,corridor_id:id,route_fingerprint:'a'.repeat(64),encrypted:cipher,state:'saved',revision:1,created_at_unix:now()-1,expires_at_unix:now()+299,cancelled_at_unix:null}],payment_execution_enabled:false,plaintext_available_to_server:false});
test('instruction response guards reject owner substitution, execution claims, expiry contradictions and private fields',()=>{
 const base=directory();assert.ok(validPaymentInstructionDirectory(base,owner));
 for(const change of [{account_address:other},{payment_execution_enabled:true},{plaintext_available_to_server:true},{items:[{...base.items[0],recipient:other}]},{items:[{...base.items[0],state:'expired'}]},{items:[base.items[0],base.items[0]]}])assert.equal(validPaymentInstructionDirectory({...base,...change},owner),false);
 const expired={...base,items:[{...base.items[0],created_at_unix:now()-300,expires_at_unix:now(),state:'expired'}]};assert.ok(validPaymentInstructionDirectory(expired,owner));
 const cancelled={...base,items:[{...base.items[0],state:'cancelled',revision:2,cancelled_at_unix:now()}]};assert.ok(validPaymentInstructionDirectory(cancelled,owner));
});
test('same-origin APIs expose only planning commands, bind real account records and preserve retry identifiers',async()=>{
 const requests=[];const input={id,corridor_id:id,route_fingerprint:'a'.repeat(64),expires_in_seconds:300,encrypted:cipher};
 assert.ok(validPaymentInstructionInput(input));
 assert.equal(validPaymentInstructionInput({...input,encrypted:{...cipher,ciphertext:"A".repeat(4096)}}),false);assert.equal(validPaymentInstructionInput({...input,amount:'12'}),false);
 const options={fetchImpl:async(url,init)=>{requests.push([url,init]);return init.method==='GET'?Response.json(directory()):new Response(null,{status:204});}};
 await listPaymentInstructions(owner,options);await savePaymentInstruction(input,options);await savePaymentInstruction(input,options);await cancelPaymentInstruction(id,1,options);
 assert.deepEqual(requests.map(r=>r[1].method),['GET','PUT','PUT','POST']);
 assert.equal(requests[1][1].body,requests[2][1].body);assert.ok(requests.every(r=>r[0]==='/api/account/instructions'&&r[1].credentials==='same-origin'));
 await assert.rejects(listPaymentInstructions(owner,{fetchImpl:async()=>Response.json({...directory(),account_address:other})}),/Unverified/);
 await assert.rejects(savePaymentInstruction(input,{fetchImpl:async()=>new Response(null,{status:409})}),e=>e.status===409);
});
test('actual instruction encryption hides details and binds account, identifier and route',async()=>{
 const route={id,origin_country:'NG',destination_country:'GB',asset_code:'USDC',asset_issuer:null,privacy_rail:'private-payments'};
 const fingerprint=await fingerprintInstructionRoute(route);assert.equal(fingerprint,"20c275c9036c67194652e03698526070566bafc86cb1cc523f76df6161441c20");
 assert.notEqual(fingerprint,await fingerprintInstructionRoute({...route,asset_code:'XLM'}));
 const draft={kind:'personal',corridor_id:id,recipient:other,amount:'42.50',reference:''};
 const password='instruction-test-password-long';const encrypted=await encryptCustomerDraft(owner,id,password,draft);
 const wire=JSON.stringify({id,corridor_id:id,route_fingerprint:fingerprint,expires_in_seconds:300,encrypted});
 for(const secret of [other,draft.amount,password])assert.ok(!wire.includes(secret));
 assert.deepEqual(await decryptCustomerDraft(owner,id,password,encrypted),draft);
 await assert.rejects(decryptCustomerDraft(other,id,password,encrypted));
 await assert.rejects(decryptCustomerDraft(owner,'b12ef783-d60b-4427-aa62-d2562acd4cef',password,encrypted));
});
