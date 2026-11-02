import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { transactionSchema,templateSchema,budgetSchema } from '../../budget-data';
import {billSchema,billPlanSchema} from '../../bills-data';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Please sign in again.'},401);
 const result=await env.DB!.prepare('SELECT id,kind,payload,version FROM records WHERE user_id=?').bind(user.userId).all();
 return json({records:result.results.map((r:any)=>({...r,payload:JSON.parse(r.payload)}))});
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Please sign in again.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request too large.'},413);
 let b:any;try{const raw=await request.text();if(raw.length>12000)return json({error:'Request too large.'},413);b=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!b||typeof b.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)||!Number.isSafeInteger(b.version)||b.version<0)return json({error:'Invalid record.'},400);
 if(b.action==='delete'){
 const result=await env.DB!.prepare('DELETE FROM records WHERE user_id=? AND id=? AND version=?').bind(user.userId,b.id,b.version).run();
 return result.meta.changes?json({ok:true}):json({error:'This record changed on another device. Refresh and try again.'},409);
 }
 if(b.action!=='save')return json({error:'Invalid action.'},400);
 const schema=b.kind==='transaction'?transactionSchema:b.kind==='template'?templateSchema:b.kind==='budget'?budgetSchema:b.kind==='bill'?billSchema:b.kind==='billplan'?billPlanSchema:null;
 const parsed=schema?.safeParse(b.payload);if(!parsed?.success)return json({error:'Check the amount, category, and date.'},400);
 if(b.kind==='budget'&&b.id!=='budget-'+(parsed.data as any).month)return json({error:'Invalid budget month.'},400);
 if(b.kind==='billplan'&&b.id!=='billplan-'+(parsed.data as any).month)return json({error:'Invalid plan month.'},400);
 if(b.kind==='bill'&&(parsed.data as any).transactionId){const linked=await env.DB!.prepare('SELECT payload FROM records WHERE user_id=? AND id=? AND kind=?').bind(user.userId,(parsed.data as any).transactionId,'transaction').first();if(!linked||JSON.parse(linked.payload as string).group!=='Bills')return json({error:'Choose an existing Bills transaction from your account.'},400);}
 const payload=JSON.stringify(parsed.data);
 // A retry after a lost response must not create another quick expense.
 if(b.kind==='transaction'&&b.version===0&&(parsed.data as any).status==='pending'){
 const existing=await env.DB!.prepare('SELECT payload FROM records WHERE user_id=? AND id=? AND kind=?').bind(user.userId,b.id,'transaction').first();
 if(existing&&existing.payload===payload)return json({ok:true});
 }
 if(b.kind==='bill'&&b.version>0){const current=await env.DB!.prepare('SELECT payload FROM records WHERE user_id=? AND id=? AND kind=?').bind(user.userId,b.id,'bill').first();if(current){const old=JSON.parse(current.payload as string),next=parsed.data as any;if(old.installments&&(JSON.stringify(old.installments)!==JSON.stringify(next.installments)||old.name!==next.name||old.month!==next.month||old.category!==next.category))return json({error:'The payment schedule is locked. Update payment status to change the remaining count.'},400);}}
 const result=b.version===0
 ?await env.DB!.prepare('INSERT INTO records (user_id,id,kind,payload,version) VALUES (?,?,?,?,1) ON CONFLICT(user_id,id) DO NOTHING').bind(user.userId,b.id,b.kind,payload).run()
 :await env.DB!.prepare('UPDATE records SET payload=?,version=version+1 WHERE user_id=? AND id=? AND kind=? AND version=?').bind(payload,user.userId,b.id,b.kind,b.version).run();
 return result.meta.changes?json({ok:true}):json({error:'This record changed on another device. Refresh before saving again.'},409);
}
