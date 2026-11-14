import assert from 'node:assert/strict';
import {accountRecordId,defaultAccounts,accountSchema,renameWalletFields} from './app/accounts-data.ts';
import {transactionSchema} from './app/budget-data.ts';
assert.equal(await accountRecordId(' My Wallet '),await accountRecordId('my  wallet'));
assert.equal(accountSchema.safeParse({name:'   '}).success,false);
for(const kind of ['transaction','template']){
 for(const field of ['account','fromAccount','toAccount']){
  const old={amount:100,date:'2026-11-13',note:'Cash Out', [field]:'Cash Out'};
  const updated=renameWalletFields(kind,old);
  assert.deepEqual(updated,{...old,[field]:'My Wallet'});
  assert.equal(renameWalletFields(kind,updated),updated);
 }
}
const base='http://127.0.0.1:5173',login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'}),cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const headers={'Content-Type':'application/json',Origin:base,Cookie:cookie},post=b=>fetch(base+'/api/records',{method:'POST',headers,body:JSON.stringify(b)});
const name='Test wallet '+Date.now(),id=await accountRecordId(name),body={action:'save',id,kind:'account',version:0,payload:{name}};
assert.equal((await post(body)).status,200);assert.equal((await post(body)).status,200,'retry safe');
const tid=crypto.randomUUID(),tx={action:'save',id:tid,kind:'transaction',version:0,payload:{amount:8500,group:'Expenses',category:'Food',note:'Account test',date:'2026-11-13',account:name}};
assert.equal((await post(tx)).status,200);let rows=(await(await fetch(base+'/api/records',{headers:{Cookie:cookie}})).json()).records;assert.equal(rows.find(r=>r.id===tid).payload.account,name,'persists custom account');
assert.equal((await post({...tx,version:1,payload:{...tx.payload,account:'Not my account'}})).status,400,'reject unowned account');
assert.equal((await post({...tx,version:1,payload:{...tx.payload,account:defaultAccounts[0]}})).status,200,'default account');
assert.equal((await post({...body,id:crypto.randomUUID(),payload:{name:'Security Bank'}})).status,400,'no duplicate default');
assert.equal((await post({...body,id:crypto.randomUUID(),payload:{name:'Other'}})).status,400,'validate deterministic key');
assert.equal(transactionSchema.safeParse({...tx.payload,account:'a'.repeat(61)}).success,false);
assert.equal((await post({action:'delete',id:tid,version:2})).status,200);assert.equal((await post({action:'delete',id,version:1})).status,200);
console.log('PASS: custom/default accounts, normalization, retry, persistence, account ownership and validation.');
