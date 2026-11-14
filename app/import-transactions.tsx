'use client';
import {useState} from 'react';
import {parseTransactions,planImport} from './import-data';
import {money,totals,type RecordRow,type Txn} from './budget-data';
export default function ImportTransactions({finish}:{finish:(message:string)=>void}){
 const [text,setText]=useState(''),[plan,setPlan]=useState<Awaited<ReturnType<typeof planImport>>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState('');
 async function fresh(){const r=await fetch('/api/records',{cache:'no-store'});const d:any=await r.json();if(!r.ok)throw Error(d.error||'Could not read your transactions.');return d.records as RecordRow[];}
 async function preview(){setError('');setBusy(true);try{const parsed=parseTransactions(text);setPlan(await planImport(parsed,await fresh()));}catch(e:any){setError(e.message);}finally{setBusy(false)}}
 async function save(){
 if(!plan)return;setBusy(true);setError('');let added=0,skipped=0;
 try{
 const latest=await planImport(plan.map(x=>x.payload),await fresh());
 for(let i=0;i<latest.length;i++){const row=latest[i];setProgress('Checking transaction '+(i+1)+' of '+latest.length);
 if(row.skip){skipped++;continue;}
 const r=await fetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:row.id,version:0,kind:'transaction',payload:row.payload})});
 const d:any=await r.json();if(!r.ok){if(r.status===409&&(await fresh()).some(x=>x.id===row.id)){skipped++;continue;}throw Error(d.error||'Could not save this transaction.');}added++;
 }
 const verified=await planImport(latest.map(x=>x.payload),await fresh());if(verified.some(x=>!x.skip))throw Error('Some records could not be verified. Review and retry.');
 finish('Import verified: '+added+' added, '+skipped+' already present. All '+latest.length+' spreadsheet transactions are accounted for.');
 }catch(e:any){setError(e.message+' '+added+' saved during this attempt. Retry safely; existing records will be skipped.');}finally{setBusy(false);setProgress('')}
 }
 const values=plan?totals(plan.map(x=>x.payload)):{Income:0,Expenses:0,Bills:0,Savings:0};
 return <div className="entry-form"><p className="muted">Paste the five columns from your Google Sheet, including the header row. Dates and times are interpreted in Philippine time. Matching records are skipped; existing entries are never overwritten.</p>
 <label className="import-label">Spreadsheet transactions<textarea aria-label="Spreadsheet transactions" rows={7} value={text} disabled={busy} onChange={e=>{setText(e.target.value);setPlan(null)}} placeholder="Timestamp → Description → Category → Sub-Category → Amount"/></label>
 <button className="secondary" disabled={busy||!text.trim()} onClick={preview}>Review import</button>
 {plan&&<><div className="import-summary"><strong>{plan.length} {plan.length===1?'transaction':'transactions'}</strong><span>{plan.filter(x=>!x.skip).length} new · {plan.filter(x=>x.skip).length} already present</span><span>Income {money(values.Income)}</span><span>Spending {money(values.Expenses+values.Bills)}</span></div><div className="import-preview">{plan.map((r,i)=><div key={i}><span>{r.payload.date} {r.payload.time}<br/><strong>{r.payload.note||r.payload.category}</strong><br/>{r.payload.group} → {r.payload.category}</span><span>{money(r.payload.amount)}<br/>{r.skip?'Already present':'New'}</span></div>)}</div><button className="primary" disabled={busy} onClick={save}>{busy?'Importing…':'Import transactions'}</button></>}
 {progress&&<p role="status" className="muted">{progress}</p>}{error&&<p role="alert" className="form-error">{error}</p>}</div>
}
