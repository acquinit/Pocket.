// Parse arithmetic without evaluating executable code. Round the final result to centavos.
export function calculateAmount(input:string):number|null{
 const s=input.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replace(/\s/g,'');
 if(!s||s.length>120||!/^\d+(?:\.\d{1,2})?(?:[+*/-]\d+(?:\.\d{1,2})?)*$/.test(s))return null;
 const parts=s.match(/\d+(?:\.\d{1,2})?|[+*/-]/g)!;
 let sum=0,term=Number(parts[0]);
 for(let i=1;i<parts.length;i+=2){const op=parts[i],n=Number(parts[i+1]);if(op==='*')term*=n;else if(op==='/'){if(n===0)return null;term/=n;}else{sum+=term;term=op==='-'?-n:n;}}
 const cents=Math.round((sum+term+Number.EPSILON)*100);
 return Number.isSafeInteger(cents)&&cents>0&&cents<=100000000000?cents:null;
}
export function manilaTimestamp(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=(type:string)=>parts.find(p=>p.type===type)!.value;
 return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}:${get('second')}`};
}

export function capturePayload(amount:number,now=new Date()){
 return {amount,group:'Expenses' as const,category:'Uncategorized',note:'',status:'pending' as const,...manilaTimestamp(now)};
}