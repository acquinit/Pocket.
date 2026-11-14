import {z} from 'zod';
export const walletName='My Wallet';
export const previousWalletName='Cash Out';
export const defaultAccounts=['Security Bank','MariBank','GoTyme','Maya',walletName,'Atome','DiskarTech'];
export function renameWalletFields(kind:unknown,payload:any){
 if((kind!=='transaction'&&kind!=='template')||!payload||typeof payload!=='object')return payload;
 const fields=['account','fromAccount','toAccount'].filter(field=>payload[field]===previousWalletName);
 if(!fields.length)return payload;
 const updated={...payload};
 for(const field of fields)updated[field]=walletName;
 return updated;
}
export const normalizeAccount=(name:string)=>name.trim().replace(/\s+/g,' ');
export const accountSchema=z.object({name:z.string().transform(normalizeAccount).pipe(z.string().min(1).max(60))});
export async function accountRecordId(name:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeAccount(name).toLowerCase()));return 'account-'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
