import assert from 'node:assert/strict';
import {parseTransactions,planImport} from './app/import-data.ts';
const header='Timestamp\tDescription\tCategory\tSub-Category\tAmount\n';
const row='10/14/2026 19:49:16\tTest internet\tBills\tInternet\t1,500.25';
const parsed=parseTransactions(header+row);
assert.equal(parsed[0].amount,150025);assert.equal(parsed[0].time,'19:49:16');assert.equal(parsed[0].date,'2026-10-14');
assert.throws(()=>parseTransactions(header+row.replace('19:49:16','29:49:16')));
assert.throws(()=>parseTransactions(header+row.replace('10/14/2026','02/30/2026')));
assert.throws(()=>parseTransactions(header+row.replace('1,500.25','1,50')));
const csv=parseTransactions('\uFEFFTimestamp,Description,Category,Sub-Category,Amount\r\n"10/14/2026 19:49:16","Test, internet","Bills","Internet","₱1,500.25"\r\n');
assert.equal(csv.length,1);assert.equal(csv[0].note,'Test, internet');assert.equal(csv[0].amount,150025);assert.equal(csv[0].date,'2026-10-14');
const quoted=parseTransactions('Timestamp,Description,Category,Sub-Category,Amount\n10/14/2026 19:49:16,"Lunch ""with Ana""",Expenses,Food,₱250.50');
assert.equal(quoted[0].note,'Lunch "with Ana"');assert.equal(quoted[0].amount,25050);
const loose=parseTransactions('Timestamp,Description,Category,Sub-Category,Amount\n10/14/2026 19:49:16,Internet,Bills,Internet,1,500.25');
assert.equal(loose[0].amount,150025);
const pocketHeader='"Date","Time","Category","Subcategory","Description","Amount (PHP)","Status","Account","From account","To account"\r\n';
const pocketRows='"2026-11-23","22:01:00","Expenses","Others","Test baon","200.00","Complete","My Wallet","",""\r\n'+
 '"2026-11-23","22:27:29","Expenses","Uncategorized","","65.00","Needs details","Unassigned","",""\r\n'+
 '"2026-11-23","21:56:32","Transfer","Account transfer","Allowance","1800.00","Complete","","MariBank","My Wallet"'+'\r\n'+
 '"2026-11-14","","Expenses","Others","Blank time","100.00","Complete","My Wallet","",""';
const pocket=parseTransactions(pocketHeader+pocketRows);
assert.equal(pocket.length,4);
assert.equal(pocket[3].time===undefined||pocket[3].time==='',true);
assert.equal(pocket[0].status,'complete');assert.equal(pocket[0].account,'My Wallet');assert.equal(pocket[0].amount,20000);
assert.equal(pocket[1].status,'pending');assert.equal(pocket[1].category,'Uncategorized');assert.equal(pocket[1].amount,6500);assert.equal(pocket[1].account===undefined||pocket[1].account==='',true);
assert.equal(pocket[2].status,'complete');assert.equal(pocket[2].fromAccount,'MariBank');assert.equal(pocket[2].toAccount,'My Wallet');assert.equal(pocket[2].amount,180000);
assert.throws(()=>parseTransactions('Name,Amount\nTest,100'));
assert.throws(()=>parseTransactions(pocketHeader+'"2026-11-23","22:01:00","Expenses","Others","Test","200.00","Maybe","My Wallet","",""'));
const plan=await planImport([parsed[0],parsed[0]],[]);
assert.equal(plan.length,2);assert.notEqual(plan[0].id,plan[1].id);
let existing=plan.map(r=>({id:r.id,kind:'transaction',payload:r.payload,version:1}));
assert.equal((await planImport([parsed[0],parsed[0]],existing)).filter(r=>!r.skip).length,0);
assert.equal((await planImport([parsed[0],parsed[0]],existing.slice(0,1))).filter(r=>!r.skip).length,1);
const manual={id:'manual',kind:'transaction',payload:{...parsed[0],time:undefined},version:1};
assert.equal((await planImport([parsed[0]],[manual]))[0].skip,true);
assert.equal((await planImport([parsed[0]],[{...existing[0],payload:{...parsed[0],note:'edited'}}]))[0].skip,true);
console.log('PASS: spreadsheet and Pocket CSV parsing, CSV/BOM/CRLF, quoted fields, statuses, accounts, exact cents/timestamps, category validation, invalid dates/times, repeat imports, partial retries, multiplicity, manual matches and edited imports.');
