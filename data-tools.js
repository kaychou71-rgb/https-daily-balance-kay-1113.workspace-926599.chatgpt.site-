/* Shared by the browser and Node tests. Storage remains daily-balance-v1. */
(function(root){
  'use strict';
  const nutrients=['cal','protein','carbs'];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
  function validDate(s){
    if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
  }
  function validate(data){
    if(!object(data)||!Array.isArray(data.meals)||data.meals.length>100000)throw Error('備份的餐點格式或筆數不正確');
    const ids=new Set();
    for(const m of data.meals){
      if(!object(m)||typeof m.id!=='string'||!m.id||typeof m.name!=='string'||!m.name.trim()||!validDate(m.date)||!['早餐','午餐','晚餐','點心'].includes(m.type)||!nutrients.concat('servings').every(k=>typeof m[k]==='number'&&Number.isFinite(m[k])&&m[k]>=0)|| (own(m,'fat')&&(!Number.isFinite(m.fat)||m.fat<0)))throw Error('備份含有無效餐點，未匯入任何資料');
      if(ids.has(m.id))throw Error('備份內有重複 ID，未匯入任何資料');ids.add(m.id);
    }
    if(data.goals!==null&&(!object(data.goals)||!nutrients.every(k=>Number.isFinite(data.goals[k])&&data.goals[k]>0)||(own(data.goals,'fat')&&(!Number.isFinite(data.goals.fat)||data.goals.fat<=0))))throw Error('備份的營養目標不正確');
    return data;
  }
  function canonical(v){return JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))]))):v);}
  function parse(text){
    if(text.length>20*1024*1024)throw Error('備份超過 20 MB');
    const value=JSON.parse(text.replace(/^\uFEFF/,''));
    if(object(value)&&own(value,'format')){
      if(value.format!=='daily-balance-backup'||value.version!==1)throw Error('不支援此備份版本');
      return validate(value.data);
    }
    return validate(value);
  }
  function backup(data){return JSON.stringify({format:'daily-balance-backup',version:1,exportedAt:new Date().toISOString(),data},null,2);}
  function merge(current,incoming){
    validate(incoming);
    const ids=new Map(current.meals.map(m=>[m.id,m]));let added=0,duplicates=0,conflicts=0;
    const meals=current.meals.slice();
    for(const m of incoming.meals){const old=ids.get(m.id);if(old){if(canonical(old)===canonical(m))duplicates++;else conflicts++;}else{meals.push(m);ids.set(m.id,m);added++;}}
    const goals=current.goals===null?incoming.goals:current.goals;
    return {data:{...current,meals,goals},added,duplicates,conflicts,goalsAdded:current.goals===null&&incoming.goals!==null};
  }
  function csv(data){
    // Excel's legacy import wizard truncates quoted fields containing line breaks.
    // Keep each record on one physical line; JSON retains the exact original text.
    const cell=v=>'"'+String(v??'').replace(/\r\n|\r|\n/g,' ⏎ ').replace(/^[\s\uFEFF]*[=+@-]/,s=>"'"+s).replace(/"/g,'""')+'"';
    const rows=[['日期','餐別','餐點名稱','份數','每份熱量(kcal)','每份蛋白質(g)','每份碳水(g)','每份脂肪(g)','總熱量(kcal)','總蛋白質(g)','總碳水(g)','總脂肪(g)','紀錄ID']];
    for(const m of data.meals)rows.push([m.date,m.type,m.name,m.servings,m.cal,m.protein,m.carbs,m.fat,...['cal','protein','carbs','fat'].map(k=>Number.isFinite(m[k])?Math.round(m[k]*m.servings*1000)/1000:''),m.id]);
    return '\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
  }
  const api={validate,parse,backup,merge,csv};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.BalanceData=api;
})(globalThis);
