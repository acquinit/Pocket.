import {transactionSchema, cents, validDate, type Txn, type RecordRow} from './budget-data.ts';
type ParsedRow={cells:string[];line:number};
const SHEET_HEADER='Timestamp|Description|Category|Sub-Category|Amount';
const POCKET_HEADER='Date|Time|Category|Subcategory|Description|Amount (PHP)|Status|Account|From account|To account';
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
function dataRows(rows:ParsedRow[]){
  const data=rows.filter(r=>r.cells.some(c=>c.trim()));
  if(!data.length||data.length>500)throw Error('Add between 1 and 500 transactions.');
  return data;
}
function cleanAccount(value:string){
  return value.trim().toLowerCase()==='unassigned'?'':value.trim();
}
function amountToCents(raw:string,line:number){
  const text=raw.trim().replace(/^₱\s*/,'');
  if(text.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text))throw Error('Row '+line+': invalid amount.');
  const amount=cents(text.replaceAll(',',''));
  if(amount===null)throw Error('Row '+line+': invalid amount.');
  return amount;
}
function parseSheetRows(rows:ParsedRow[],delimiter:string):Txn[]{
  return dataRows(rows).map(({cells:original,line})=>{
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
   const parsed=transactionSchema.safeParse({date:y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0'),time:h.padStart(2,'0')+':'+min+':'+s,note,group:group.trim(),category:category.trim(),amount:amountToCents(raw,line)});
   if(!parsed.success)throw Error('Row '+line+': check the date, time, amount, and category.');
   return parsed.data;
  });
}
function parsePocketRows(rows:ParsedRow[]):Txn[]{
  return dataRows(rows).map(({cells,line})=>{
   if(cells.length!==10)throw Error('Row '+line+': expected ten columns.');
   const [date,time,group,subcategory,description,raw,statusText,accountRaw,fromRaw,toRaw]=cells.map(x=>x.trim());
   const account=cleanAccount(accountRaw),fromAccount=cleanAccount(fromRaw),toAccount=cleanAccount(toRaw);
   if(!validDate(date))throw Error('Row '+line+': use YYYY-MM-DD for the date.');
   if(time&&!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time))throw Error('Row '+line+': use HH:mm:ss for the time.');
   const statusKey=statusText.toLowerCase();
   const status=statusKey===''||statusKey==='complete'?'complete':statusKey==='pending'||statusKey==='needs details'?'pending':null;
   if(!status)throw Error('Row '+line+': unknown status "'+statusText+'".');
   const payload:Record<string,unknown>={date,group,category:subcategory,note:description,amount:amountToCents(raw,line),status};
   if(time)payload.time=time;
   if(account)payload.account=account;
   if(fromAccount)payload.fromAccount=fromAccount;
   if(toAccount)payload.toAccount=toAccount;
   const parsed=transactionSchema.safeParse(payload);
   if(!parsed.success)throw Error('Row '+line+': check the category, status, amount, and accounts.');
   return parsed.data;
  });
}
export function parseTransactions(text:string):Txn[]{
  const delimiter=detectDelimiter(text),rows=parseDelimited(text,delimiter);
  const head=rows.shift()?.cells.map(x=>x.trim());
  if(head?.join('|')===SHEET_HEADER)return parseSheetRows(rows,delimiter);
  if(head?.join('|')===POCKET_HEADER)return parsePocketRows(rows);
  throw Error('Choose a Pocket CSV export or paste the five spreadsheet columns: Timestamp, Description, Category, Sub-Category, Amount.');
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
