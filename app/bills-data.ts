import {z} from 'zod';
import {validDate,today,RecordRow} from './budget-data';
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
