const transitions={seen:['atandi','revizyon'],accept:['atandi','revizyon'],start:['atandi','revizyon'],submit:['devam_ediyor'],approve:['onay_bekliyor'],revision:['onay_bekliyor']};
const expected=[['seen','atandi',true],['accept','atandi',true],['start','atandi',true],['submit','devam_ediyor',true],['approve','onay_bekliyor',true],['revision','onay_bekliyor',true],['approve','devam_ediyor',false],['submit','atandi',false]];
for(const [action,status,ok] of expected){const actual=(transitions[action]||[]).includes(status);if(actual!==ok)throw new Error(`${action}/${status}: expected ${ok}, got ${actual}`)}
console.log(`Workflow transition checks passed: ${expected.length}`);
