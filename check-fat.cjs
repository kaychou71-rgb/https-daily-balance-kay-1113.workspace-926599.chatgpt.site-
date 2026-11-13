const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync('dist/app.js','utf8').replace(/render\(\);\s*$/,'');
const elements={};let written;
const element=id=>elements[id]??=( {value:'',textContent:'',style:{},hidden:false,setAttribute(){},addEventListener(){},replaceChildren(){},append(){},close(){},showModal(){},reset(){},classList:{toggle(){}}} );
const old={meals:[{id:'legacy',date:'2026-11-13',type:'早餐',name:'舊餐點',cal:100,protein:10,carbs:15,servings:2}],goals:{cal:2000,protein:100,carbs:200}};
const c=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Math.random())},localStorage:{getItem:()=>JSON.stringify(old),setItem:(k,v)=>written=JSON.parse(v)},crypto:{randomUUID:()=> 'new'},URL,console,setTimeout:()=>0,clearTimeout(){}});
vm.runInContext(src,c);vm.runInContext("$('date').value='2026-11-13'",c);
assert.equal(vm.runInContext('totals().cal',c),200);assert.equal(vm.runInContext('missingFat()',c),1);assert.equal(vm.runInContext('state.goals.cal',c),2000);
vm.runInContext("state.meals.push({id:'new',date:'2026-11-13',type:'午餐',name:'新餐點',cal:100,protein:10,carbs:15,fat:4.5,servings:2});render()",c);
assert.equal(elements.fat.textContent,9);assert.equal(elements['fat-note'].hidden,false);assert.match(elements['fat-note'].textContent,/1 筆/);
vm.runInContext("state.meals[0].fat=0;render()",c);assert.equal(elements['fat-note'].hidden,true);assert.equal(elements.fat.textContent,9);
vm.runInContext("save(state)",c);assert.equal(written.meals[1].fat,4.5);
assert.equal(vm.runInContext('foods.every(f=>Number.isFinite(f[5]))',c),true);
const html=fs.readFileSync('dist/index.html','utf8');for(const id of ['fat','fat-goal','fat-note','meal-fat','target-fat'])assert.ok(html.includes('id="'+id+'"'),id);
console.log('PASS: legacy records/goals retained; unknown fat flagged; 2 portions × 4.5 g = 9 g; zero fat valid; persistence; food values; all fat fields.');

