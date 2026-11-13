import {z} from 'zod';
export const defaultAccounts=['Security Bank','MariBank','GoTyme','Maya','Cash Out','Atome','DiskarTech'];
export const normalizeAccount=(name:string)=>name.trim().replace(/\s+/g,' ');
export const accountSchema=z.object({name:z.string().transform(normalizeAccount).pipe(z.string().min(1).max(60))});
export async function accountRecordId(name:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeAccount(name).toLowerCase()));return 'account-'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
