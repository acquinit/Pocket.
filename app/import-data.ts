import {transactionSchema, cents, type Txn, type RecordRow} from './budget-data';
export function parseTransactions(text:string):Txn[]{
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const head=lines.shift()?.split('\t').map(x=>x.trim());
 if(head?.join('|')!=='Timestamp|Description|Category|Sub-Category|Amount')throw Error('Copy the five spreadsheet columns, including their header row: Timestamp, Description, Category, Sub-Category, Amount.');
 if(!lines.length||lines.length>500)throw Error('Paste between 1 and 500 transactions.');
 return lines.filter(l=>l.trim()).map((line,i)=>{
  const cells=line.split('\t');if(cells.length!==5)throw Error('Row '+(i+2)+': expected five columns.');
  const [stamp,note,group,category,raw]=cells;
  const match=stamp.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/);
  if(!match)throw Error('Row '+(i+2)+': use M/D/YYYY H:mm:ss for the timestamp.');
  const [,m,d,y,h,min,s]=match;
  const amountText=raw.trim().replace(/^₱\s*/,'');
  if(amountText.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(amountText))throw Error('Row '+(i+2)+': invalid amount.');
  const parsed=transactionSchema.safeParse({date:y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0'),time:h.padStart(2,'0')+':'+min+':'+s,note,group:group.trim(),category:category.trim(),amount:cents(amountText.replaceAll(',',''))});
  if(!parsed.success)throw Error('Row '+(i+2)+': check the date, time, amount, and category.');
  return parsed.data;
 });
}
const identity=(t:Txn)=>JSON.stringify([t.date,t.time||'',t.group,t.category,t.note.trim(),t.amount]);
const similar=(t:Txn)=>JSON.stringify([t.date,t.group,t.category,t.note.trim(),t.amount]);
export async function planImport(incoming:Txn[],existing:RecordRow[]){
 const occurrences=new Map<string,number>();const used=new Set<string>();const records=existing.filter(r=>r.kind==='transaction');const result:{id:string;payload:Txn;skip:boolean}[]=[];
 for(const payload of incoming){
 const key=identity(payload),n=(occurrences.get(key)||0)+1;occurrences.set(key,n);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'|'+n));
 const id='import-'+Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const sameId=records.find(r=>r.id===id);
 const match=sameId||records.find(r=>!used.has(r.id)&&similar(r.payload)===similar(payload)&&(!r.payload.time||r.payload.time===payload.time));
 if(match)used.add(match.id);
 result.push({id,payload,skip:!!match});
 }return result;
}
