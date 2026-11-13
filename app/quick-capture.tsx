"use client";
import {useRef,useState} from 'react';
import {calculateAmount,capturePayload} from './quick-math';
import {money} from './budget-data';

export default function QuickCapture({write,busy,review,count}:{write:(body:any)=>Promise<boolean>;busy:boolean;review:()=>void;count:number}){
 const [expression,setExpression]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const lock=useRef(false),attempt=useRef<any>(null);
 const amount=calculateAmount(expression);
 function change(value:string){if(lock.current)return;setExpression(value);setError('');setSaved('');attempt.current=null;}
 function key(value:string){if(value==='AC')return change('');if(value==='⌫')return change(expression.slice(0,-1));if(value==='='){if(amount===null){setError('Enter a complete calculation with a positive total.');return;}change((amount/100).toFixed(2));return;}change((expression+value).slice(0,120));}
 async function save(){if(lock.current||busy)return;if(amount===null){setError('Enter a positive amount or complete calculation, such as 50 + 35.');return;}lock.current=true;setError('');
  if(!attempt.current)attempt.current={action:'save',id:crypto.randomUUID(),kind:'transaction',version:0,payload:capturePayload(amount)};
  try{if(await write(attempt.current)){setSaved(money(amount)+' saved · Needs details');setExpression('');attempt.current=null;}else setError('Not confirmed. Your amount is still here—retry when connected.');}finally{lock.current=false;}
 }
 return <section className="quick-capture" aria-label="Quick expense calculator"><div className="capture-intro"><span className="eyebrow">CAPTURE THE MOMENT</span><h3>Amount now. Details later.</h3><p>Save what you spent in seconds. Add the description and category when you have a moment.</p><span className="capture-note">Counts toward spending immediately.<br/>Date and time are saved automatically.</span>{count>0&&<button className="secondary" onClick={review}>Finish {count} {count===1?'entry':'entries'} · Needs details</button>}</div><form className="capture-calculator" onSubmit={e=>{e.preventDefault();save()}}><label htmlFor="capture-amount">Amount or calculation</label><input id="capture-amount" autoComplete="off" inputMode="decimal" placeholder="0.00" maxLength={120} value={expression} disabled={busy} onChange={e=>change(e.target.value)} onKeyDown={e=>{if(e.key==='='){e.preventDefault();key('=')}}}/><div className="capture-total" aria-live="polite">{amount===null?'':money(amount)}</div><div className="capture-keys">{['AC','⌫','÷','×','7','8','9','−','4','5','6','+','1','2','3','=','0','.'].map(k=><button key={k} type="button" disabled={busy} className={/^[0-9.]$/.test(k)?'':'operator'} aria-label={k==='⌫'?'Backspace':k==='AC'?'Clear calculation':k==='='?'Calculate total':k} onClick={()=>key(k)}>{k}</button>)}<button className="capture-enter" type="submit" disabled={busy||amount===null}>{busy?'Saving…':'Enter ↵'}</button></div>{error&&<p className="form-error" role="alert">{error}</p>}{saved&&<p className="capture-saved" role="status">{saved}</p>}</form></section>
}
