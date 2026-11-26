import {transactionSchema, cents, type Txn, type RecordRow} from './budget-data.ts';
type ParsedRow={cells:string[];line:number};
function detectDelimiter(text:string){
  const firstLine=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0]??'';
  let quoted=false,commas=0,tabs=0;
  for(const ch of firstLine){
    if(ch==='"'){quoted=!quoted;continue;}
    if(quoted)continue;
    if(ch===',')commas++;
    if(ch==='\t')tabs++;
  }
  return tabs>commas?'\t':',';
}
function parseDelimited(text:string,delimiter:string):ParsedRow[]{
  const source=text.replace(/^\uFEFF/,''),rows:ParsedRow[]=[];
  let row:string[]=[],field='',quoted=false,line=1,startedWithQuote=false;
  const finishField=()=>{row.push(field);field='';startedWithQuote=false;};
  const finishRow=()=>{finishField();rows.push({cells:row,line});row=[];};
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(quoted){
      if(ch==='"'){
        if(source[i+1]==='"'){field+='"';i++;}
        else quoted=false;
      }else if(ch==='\r'&&source[i+1]==='\n'){field+='\n';i++;line++;}
      else{if(ch==='\n')line++;field+=ch;}
      continue;
    }
    if(ch==='"'&&field===''&&!startedWithQuote){quoted=true;startedWithQuote=true;continue;}
    if(ch===delimiter){finishField();continue;}
    if(ch==='\n'){if(field.endsWith('\r'))field=field.slice(0,-1);finishRow();line++;continue;}
    if(ch==='\r'&&source[i+1]!=='\n'){finishRow();line++;continue;}
    field+=ch;
  }
  if(field!==''||row.length>0||startedWithQuote)finishRow();
  return rows;
}
export function parseTransactions(text:string):Txn[]{
  const delimiter=detectDelimiter(text),rows=parseDelimited(text,delimiter);
  const head=rows.shift()?.cells.map(x=>x.trim());
  if(head?.join('|')!=='Timestamp|Description|Category|Sub-Category|Amount')throw Error('Choose or paste the five spreadsheet columns, including their header row: Timestamp, Description, Category, Sub-Category, Amount.');
  const data=rows.filter(r=>r.cells.some(c=>c.trim()));
  if(!data.length||data.length>500)throw Error('Add between 1 and 500 transactions.');
  return data.map(({cells:original,line})=>{
   let cells=original;
   if(delimiter===','&&cells.length>5){
    const amount=cells.slice(4).join(',').trim(),bare=amount.replace(/^₱\s*/,'');
    if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(bare))cells=[...cells.slice(0,4),amount];
   }
   if(cells.length!==5)throw Error('Row '+line+': expected five columns.');
   const [stamp,note,group,category,raw]=cells;
   const match=stamp.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/);
   if(!match)throw Error('Row '+line+': use M/D/YYYY H:mm:ss for the timestamp.');
   const [,m,d,y,h,min,s]=match;
   const amountText=raw.trim().replace(/^₱\s*/,'');
   if(amountText.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(amountText))throw Error('Row '+line+': invalid amount.');
   const parsed=transactionSchema.safeParse({date:y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0'),time:h.padStart(2,'0')+':'+min+':'+s,note,group:group.trim(),category:category.trim(),amount:cents(amountText.replaceAll(',',''))});
   if(!parsed.success)throw Error('Row '+line+': check the date, time, amount, and category.');
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
