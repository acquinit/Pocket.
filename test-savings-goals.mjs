import assert from 'node:assert/strict';
import {savingsGoals,savingsTargetKey} from './app/budget-data.ts';

const tx=(category,amount,date='2026-11-28')=>({id:category+amount+date,kind:'transaction',version:0,payload:{group:'Savings',category,amount,date}});
const rows=[
 tx('Wedding',50000),
 tx('Extra Savings',50000),
 tx('Emergency Fund',50000),
 {id:'billplan-2026-11',kind:'billplan',version:2,payload:{month:'2026-11',emergency:50000,wedding:1000000,savings:50000}}
];
const goals=savingsGoals(rows,rows,'2026-11');
assert.deepEqual(goals.map(g=>[g.category,g.key,g.saved,g.target]),[
 ['Wedding','wedding',50000,1000000],
 ['Extra Savings','savings',50000,50000],
 ['Emergency Fund','emergency',50000,50000]
]);
assert.equal(savingsTargetKey['Emergency Fund'],'emergency');
assert.equal(savingsTargetKey['Wedding'],'wedding');
assert.equal(savingsTargetKey['Extra Savings'],'savings');
const weddingOnly=rows.filter(r=>r.kind!=='transaction'||r.payload.category==='Wedding');
assert.equal(savingsGoals(rows,weddingOnly,'2026-11')[1].saved,0);
assert.ok(savingsGoals(rows.filter(r=>r.kind!=='billplan'),rows,'2026-11').every(g=>g.target===0));
assert.ok(savingsGoals([],[],'2026-11').every(g=>g.saved===0&&g.target===0));
console.log('PASS: savings goal mapping, period totals, targets, and zero targets.');
