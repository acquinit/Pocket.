import {z} from 'zod';
import {validDate,today,type RecordRow} from './budget-data.ts';
/** Resolve links for display only. Never create a bill or mutate a payment. */
export function reconcileBills(rows:RecordRow[],asOf=today()){
 const plans=rows.filter(r=>r.kind==='bill'),reserved=new Set(plans.map(r=>r.payload.transactionId).filter(Boolean));
 const payments=rows.filter(r=>r.kind==='transaction'&&r.payload.group==='Bills'&&r.payload.date<=asOf&&!reserved.has(r.id));
 const choices=new Map<string,RecordRow[]>(),claims=new Map<string,number>();
 for(const b of plans){
  const p=b.payload;if(p.transactionId)continue;
  const providers=plans.filter(r=>r.payload.month===p.month&&r.payload.category===p.category);
  const pool=payments.filter(t=>{
   if(!t.payload.date.startsWith(p.month)||t.payload.category!==p.category||(p.amount!==null&&p.amount!==t.payload.amount))return false;
   const note=(t.payload.note||'').toLowerCase(),named=providers.filter(r=>note.includes(r.payload.name.toLowerCase()));
   return !named.length||named.some(r=>r.id===b.id);
  });
  const named=pool.filter(t=>(t.payload.note||'').toLowerCase().includes(p.name.toLowerCase()));
  const candidates=named.length?named:pool;
  choices.set(b.id,candidates);for(const t of candidates)claims.set(t.id,(claims.get(t.id)||0)+1);
 }
 const auto=new Set<string>();
 const linked=rows.map(r=>{const matches=choices.get(r.id);if(matches?.length!==1||claims.get(matches[0].id)!==1)return r;const t=matches[0];reserved.add(t.id);auto.add(r.id);return {...r,payload:{...r.payload,transactionId:t.id}}});
 return {linked,auto,unmatched:payments.filter(t=>!reserved.has(t.id))};
}
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const amount=z.number().int().min(0).max(100000000000);
const date=z.string().refine(validDate).nullable();
export const installmentSchema=z.object({payments:z.number().int().min(1).max(120),startMonth:month,finalDate:z.string().refine(validDate)}).refine(v=>v.finalDate.slice(0,7)>=v.startMonth,'Final payment must be after the start month');
export const billSchema=z.object({month,name:z.string().trim().min(1).max(60),category:z.enum(['Internet','House Rent','Electricity Bill','Water Bill','Loan']),amount:amount.nullable(),dueDate:date,paid:z.boolean(),datePaid:date,variable:z.boolean(),note:z.string().max(300),installments:installmentSchema.optional(),transactionId:z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).nullable()}).refine(v=>!v.datePaid||v.paid,'A payment date requires paid status').refine(v=>!v.datePaid||v.datePaid<=today(),'Payment date cannot be in the future');
export const billPlanSchema=z.object({month,emergency:amount,wedding:amount,savings:amount});
export function billState(b:z.infer<typeof billSchema>,rows:RecordRow[],now=today()){
 const payment=b.transactionId?rows.find(r=>r.id===b.transactionId&&r.kind==='transaction'&&r.payload.group==='Bills'):undefined;
 const paid=b.paid||!!payment;
 return {paid,datePaid:payment?.payload.date||b.datePaid,amount:b.amount,payment,status:paid?'Paid':b.dueDate?(b.dueDate<now?'Overdue':b.dueDate===now?'Due today':'Upcoming'):'Date needed',missingPayment:!!b.transactionId&&!payment};
}

export function loanProgress(b:any,rows:RecordRow[]){
 const key=(name:string)=>name.trim().toLowerCase();
 const matches=rows.filter(r=>r.kind==='bill'&&r.payload.category==='Loan'&&key(r.payload.name)===key(b.name));
 const plan=matches.find(r=>r.payload.installments)?.payload.installments;
 if(b.category!=='Loan'||!plan)return null;
 const months=new Set<string>(),payments=new Set<string>();
 for(const r of matches){const t=r.payload;if(t.month<plan.startMonth||t.month>plan.finalDate.slice(0,7)||!billState(t,rows).paid)continue;
 if(months.has(t.month)||(t.transactionId&&payments.has(t.transactionId)))continue;
 months.add(t.month);if(t.transactionId)payments.add(t.transactionId);
 }
 return {remaining:Math.max(0,plan.payments-months.size),finalDate:plan.finalDate,total:plan.payments};
}
