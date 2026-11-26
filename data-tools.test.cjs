const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('./data-tools.js');
const meal={id:'old-1',name:'雞胸肉',date:'2026-11-13',type:'午餐',cal:200,protein:30,carbs:4,servings:1};
const legacy={meals:[meal],goals:{cal:1800,protein:90,carbs:200}};
test('legacy JSON and versioned backup preserve optional fat and extra fields',()=>{
  const input={...legacy,note:'保留',meals:[{...meal,custom:'舊資料'}]};
  assert.deepEqual(D.parse(D.backup(input)),input);assert.deepEqual(D.parse(JSON.stringify(input)),input);
  assert.equal('fat' in D.parse(D.backup(input)).meals[0],false);
});
test('reimport is idempotent and does not mutate either input',()=>{
  const incoming={meals:[meal,{...meal,id:'new-1',fat:2}],goals:null};
  const before=JSON.stringify(legacy);const result=D.merge(legacy,incoming);
  assert.equal(result.added,1);assert.equal(result.duplicates,1);assert.equal(JSON.stringify(legacy),before);
  assert.equal(D.merge(result.data,incoming).added,0);assert.equal(D.merge(result.data,incoming).duplicates,2);
});
test('same ID conflict preserves existing meal and goals',()=>{
  const result=D.merge(legacy,{meals:[{...meal,cal:999}],goals:{cal:2200,protein:80,carbs:210,fat:50}});
  assert.equal(result.conflicts,1);assert.deepEqual(result.data,legacy);
  assert.equal(D.merge({meals:[],goals:null},legacy).goalsAdded,true);
});
test('invalid file is rejected completely',()=>{
  for(const value of [null,[],{meals:[],goals:{}},{...legacy,meals:[meal,meal]},...['date','type','id','cal'].map(k=>({...legacy,meals:[{...meal,[k]:k==='id'?'':'invalid'}]})),{...legacy,meals:[{...meal,date:'2026-02-30'}]},{format:'daily-balance-backup',version:2,data:legacy}])assert.throws(()=>D.parse(JSON.stringify(value)));
  assert.throws(()=>D.parse('{'));assert.throws(()=>D.validate({...legacy,meals:[{...meal,cal:Infinity}]}));
});
test('CSV has BOM, CRLF, quoted Chinese/comma, visible newline marker and formula protection',()=>{
  const csv=D.csv({meals:[{...meal,name:'雞肉,"飯"\n便當'},{...meal,id:'b',name:' =HYPERLINK("x")'}],goals:null});
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.endsWith('\r\n'));assert.ok(csv.includes('"雞肉,""飯"" ⏎ 便當"'));assert.ok(csv.includes("\"' =HYPERLINK"));
  assert.equal(csv.split('\r\n').length,4);
  assert.ok(csv.includes('"4","","200","30","4","","old-1"'));
});
