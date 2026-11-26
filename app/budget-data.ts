import { z } from 'zod';
export const categories={
 Income:['Paycheck 1','Paycheck 2','Cashback','Interest','Refund','Rebate'],
Expenses:['Food','Drinks','Snacks','Drinking Water','Internet','Groceries','Wet/Dry Market','Transportation','Load','Laundry','Debt Payment','Subscription','Others'],
Bills:['House Rent','Electricity Bill','Water Bill','Loan','Internet'],
Savings:['Wedding','Extra Savings','Emergency Fund'],
 Transfer:['Account transfer'],
 Adjustment:['Balance reconciliation']
} as const;
export type Group=keyof typeof categories;
export const groups=Object.keys(categories) as Group[];
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function cents(s:string){if(!/^\d+(\.\d{1,2})?$/.test(s.trim()))return null;const [a,b='']=s.trim().split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0&&n<=100000000000?n:null;}
export const transactionSchema=z.object({templateId:z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).optional(),templateUsedOn:z.string().refine(validDate).optional(),amount:z.number().int().refine(n=>n!==0&&Math.abs(n)<=100000000000,'Enter a valid amount'),fee:z.number().int().nonnegative().max(100000000000).optional(),group:z.enum(['Income','Expenses','Bills','Savings','Transfer','Adjustment']),category:z.string(),date:z.string().refine(validDate),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/).optional(),account:z.string().trim().min(1).max(60).optional(),fromAccount:z.string().trim().min(1).max(60).optional(),toAccount:z.string().trim().min(1).max(60).optional(),note:z.string().max(200),status:z.enum(['pending','complete']).optional()}).refine(v=>v.status==='pending'?v.group==='Expenses'&&v.category==='Uncategorized':(categories[v.group] as readonly string[]).includes(v.category),'Choose a valid subcategory').refine(v=>v.group==='Transfer'?!!v.fromAccount&&!!v.toAccount&&v.fromAccount!==v.toAccount&&!v.account:v.group==='Adjustment'?!!v.account&&!v.fromAccount&&!v.toAccount:!v.fromAccount&&!v.toAccount,'Choose the appropriate account fields').refine(v=>v.group==='Transfer'||!v.fee,'Fees can only be added to transfers');
export const templateSchema=z.object({amount:z.number().int().positive().max(100000000000),group:z.enum(['Income','Expenses','Bills','Savings','Transfer']),category:z.string(),name:z.string().trim().min(1).max(60),account:z.string().trim().min(1).max(60).optional(),fromAccount:z.string().trim().min(1).max(60).optional(),toAccount:z.string().trim().min(1).max(60).optional(),note:z.string().max(200)}).refine(v=>(categories[v.group] as readonly string[]).includes(v.category),'Choose a valid subcategory').refine(v=>v.group==='Transfer'?!!v.fromAccount&&!!v.toAccount&&v.fromAccount!==v.toAccount&&!v.account:!v.fromAccount&&!v.toAccount,'Choose two different accounts for a transfer');
export const budgetSchema=z.object({amount:z.number().int().min(0).max(100000000000),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)});
export type Txn=z.infer<typeof transactionSchema>;
export type Template=z.infer<typeof templateSchema>;
export type RecordRow={id:string;kind:'transaction'|'template'|'budget'|'bill'|'billplan'|'account';payload:any;version:number};
export const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2}).format(n/100);
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function totals(rows:Txn[]){return rows.reduce((a,t)=>{if(t.group in a)a[t.group as keyof typeof a]+=Math.abs(t.amount);if(t.group==='Transfer')a.transferFees+=(t.fee||0);return a;},{Income:0,Expenses:0,Bills:0,Savings:0,Transfer:0,Adjustment:0,transferFees:0});}
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



export function runningBalance(transactions:Txn[],asOf=today()){
 const recorded=transactions.filter(t=>t.date<=asOf), sums=totals(recorded);
 return {...sums,spent:sums.Expenses+sums.Bills+sums.transferFees,available:sums.Income-sums.Expenses-sums.Bills-sums.Savings+sums.Adjustment-sums.transferFees};
}

/** Available recorded money: savings are reserved; transfers conserve the total. */
export function accountBalances(transactions:Txn[],names:string[],asOf=today()){
 const result=new Map<string,{income:number;spending:number;savings:number;transferIn:number;transferOut:number;balance:number;count:number}>();
 const get=(name:string)=>{if(!result.has(name))result.set(name,{income:0,spending:0,savings:0,transferIn:0,transferOut:0,balance:0,count:0});return result.get(name)!;};
 names.forEach(get);
 for(const t of transactions){if(t.date>asOf)continue;
  if(t.group==='Transfer'){const from=get(t.fromAccount!),to=get(t.toAccount!);const fee=t.fee||0;from.transferOut+=t.amount;from.balance-=t.amount+fee;from.spending+=fee;from.count++;to.transferIn+=t.amount;to.balance+=t.amount;to.count++;}
  else {const a=get(t.account||'');a.count++;if(t.group==='Income'){a.income+=t.amount;a.balance+=t.amount;}else if(t.group==='Adjustment'){a.balance+=t.amount;}else{a.balance-=t.amount;if(t.group==='Savings')a.savings+=t.amount;else a.spending+=t.amount;}}
 }
 return [...result].map(([name,v])=>({name,...v}));
}
