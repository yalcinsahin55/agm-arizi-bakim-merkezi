import fs from 'fs';
import {db,indexes} from '../lib/db';
import {randomUUID} from 'crypto';

const file=process.argv[2];
if(!file){console.error('Kullanım: npm run import:engines -- /path/seed_data.json');process.exit(1)}
const src=JSON.parse(fs.readFileSync(file,'utf8'));
const d=await db();
await indexes();

let imported=0;
let skipped=0;

// New standalone snapshot format: { sourceUpdateDate, motors: [...] }
if(Array.isArray(src.motors)){
  for(const value of src.motors){
    const legacyKey=String(value?.legacyKey||value?.key||value?.name||'').trim();
    const name=String(value?.name||legacyKey).trim();
    if(!legacyKey||!name){skipped++;continue;}
    await d.collection('motors').updateOne(
      {legacyKey},
      {$set:{name,legacyKey,active:value?.active!==false,source:String(value?.source||'agm-bakim-merkezi'),currentHours:Number(value?.hours??value?.currentHours??0)||0,currentLoad:Number(value?.load??value?.currentLoad??0)||0,sourceUpdateDate:src.sourceUpdateDate||src.updateDate||null,updatedAt:new Date()},$setOnInsert:{_id:randomUUID(),hours:Number(value?.hours)||0,load:Number(value?.load)||0,createdAt:new Date(),importedAt:new Date()}},
      {upsert:true}
    );
    imported++;
  }
}else{
  // Legacy source format from the production planned-maintenance export.
  const engines=src.engines||{};
  const oil=src.oil||{};
  const maintTypes=src.maintTypes||[];
  for(const [key,value] of Object.entries<any>(engines)){
    const name=String(value?.name||value?.engineName||key).trim(); if(!name){skipped++;continue;}
    const maintenanceSnapshot=maintTypes.map((m:any)=>{const x=m?.perEngine?.[key];return x?{key:m.key,label:m.label,lastHour:Number(x.lastHour||0),period:Number(x.period||0)}:null}).filter(Boolean);
    const oilInfo=oil[key]||null;
    await d.collection('motors').updateOne({legacyKey:key},{$set:{name,legacyKey:key,active:true,source:'agm-bakim-merkezi',currentHours:Number(value?.hours||0),currentLoad:Number(value?.load||0),oil:oilInfo?{brand:String(oilInfo.brand||''),changeHour:Number(oilInfo.changeHour||0),maxHours:Number(oilInfo.maxHours||0)}:null,maintenanceSnapshot,sourceUpdateDate:src.updateDate||null,updatedAt:new Date()},$setOnInsert:{_id:randomUUID(),createdAt:new Date()}},{upsert:true});
    imported++;
  }
}
console.log(`Motor aktarımı tamamlandı: ${imported}${skipped?` (atlanan: ${skipped})`:''}`);
