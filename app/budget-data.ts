import { z } from 'zod';
export const categories={
Income:['Paycheck 1','Paycheck 2'],
Expenses:['Food','Drinks','Snacks','Drinking Water','Internet','Groceries','Wet/Dry Market','Transportation','Load','Laundry','Debt Payment','Subscription','Others'],
Bills:['House Rent','Electricity Bill','Water Bill','Loan','Internet'],
Savings:['Wedding','Extra Savings','Emergency Fund']
} as const;
export type Group=keyof typeof categories;
export const groups=Object.keys(categories) as Group[];
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function cents(s:string){if(!/^\d+(\.\d{1,2})?$/.test(s.trim()))return null;const [a,b='']=s.trim().split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0&&n<=100000000000?n:null;}
export const transactionSchema=z.object({amount:z.number().int().positive().max(100000000000),group:z.enum(['Income','Expenses','Bills','Savings']),category:z.string(),date:z.string().refine(validDate),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/).optional(),note:z.string().max(200)}).refine(v=>(categories[v.group] as readonly string[]).includes(v.category),'Choose a valid subcategory');
export const templateSchema=z.object({amount:z.number().int().positive().max(100000000000),group:z.enum(['Income','Expenses','Bills','Savings']),category:z.string(),name:z.string().trim().min(1).max(60),note:z.string().max(200)}).refine(v=>(categories[v.group] as readonly string[]).includes(v.category),'Choose a valid subcategory');
export const budgetSchema=z.object({amount:z.number().int().min(0).max(100000000000),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)});
export type Txn=z.infer<typeof transactionSchema>;
export type Template=z.infer<typeof templateSchema>;
export type RecordRow={id:string;kind:'transaction'|'template'|'budget'|'bill'|'billplan';payload:any;version:number};
export const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2}).format(n/100);
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function totals(rows:Txn[]){return rows.reduce((a,t)=>{a[t.group]+=t.amount;return a;},{Income:0,Expenses:0,Bills:0,Savings:0});}
export function parseEntry(text:string){
 const lower=text.toLowerCase();
 const found=groups.flatMap(g=>categories[g].map(c=>({g,c}))).sort((a,b)=>b.c.length-a.c.length).find(x=>lower.includes(x.c.toLowerCase()));
 let group:Group=found?.g||'Expenses',category:string=found?.c||'Food';
 if(!found){if(/coffee|tea/.test(lower))category='Drinks';else if(/transport|angkas|jeep|bus|fare/.test(lower))category='Transportation';}
 const rest=found?lower.replace(found.c.toLowerCase(),''):lower;
 const matches=rest.match(/-?\d[\d,]*(?:\.\d+)?/g)||[];
 if(matches.length!==1)return null;
 const raw=matches[0];if(raw.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw))return null;
 const amount=cents(raw.replaceAll(',',''));if(amount===null)return null;
 return {amount,group,category,note:text.trim().slice(0,200)};
}


