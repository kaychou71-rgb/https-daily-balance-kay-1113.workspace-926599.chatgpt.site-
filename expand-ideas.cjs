const fs=require('fs');
const native='C:/Users/USER/Desktop/kay/daily-balance-ios/';
const web='C:/Users/USER/Desktop/kay/daily-balance/dist/';
const catalog=JSON.parse(fs.readFileSync(native+'src/catalog.json','utf8'));
let model=fs.readFileSync(native+'src/model.ts','utf8');
model="import catalog from './catalog.json';\n"+model;
const start=model.indexOf('export const referenceFoods:Food[]=');
const end=model.indexOf('export function foodList',start);
model=model.slice(0,start)+`export const referenceFoods:Food[]=catalog.foods;
export const recipeTemplates=catalog.recipes;
export const ideaCategories=['全部',...new Set(recipeTemplates.map(r=>r.category))];
`+model.slice(end);
model=model.slice(0,model.indexOf('export function suggestions'))+`export function suggestions(state:State,date:string,category='全部'){
 const foods=foodList(state);const avoid=state.avoid.split(/[、,，\\s]+/).filter(Boolean);const total=totals(state.meals.filter(m=>m.date===date));
 return recipeTemplates.filter(r=>category==='全部'||r.category===category)
 .map(recipe=>({recipe,items:recipe.foodIds.map(i=>foods.find(f=>f.id===i)!)}))
 .filter(({items})=>items.every(f=>f&&!avoid.some(a=>\x60\x24{f.name} \x24{f.tags.join(' ')}\x60.includes(a))))
 .map(({recipe,items})=>{const sum=totals(items.map(f=>({...f,date,type:recipe.mealType,servings:1})));const score=state.goals?nutrients.reduce((s,k)=>s+Math.abs(Math.max(0,state.goals![k]-total[k])-sum[k])/state.goals![k],0):0;return {recipe,items,sum,score};}).sort((a,b)=>a.score-b.score);
}
`;
fs.writeFileSync(native+'src/model.ts',model);
let ui=fs.readFileSync(native+'src/Main.tsx','utf8');
ui=ui.replace('Food,foodList,id,labels','Food,foodList,id,ideaCategories,labels');
ui=ui.replace("const lock=useRef(false)","const [category,setCategory]=useState('全部');\n const lock=useRef(false)");
ui=ui.replace('內建 9 種參考食物','內建 32 種參考食物');
ui=ui.replaceAll('suggestions(state,date)','suggestions(state,date,category)');
ui=ui.replace("{!state.goals&&<Text", "<View style={s.row}>{ideaCategories.map(c=><Pressable key={c} accessibilityRole=\"button\" accessibilityState={{selected:category===c}} style={[s.chip,category===c&&s.chipActive]} onPress={()=>setCategory(c)}><Text style={category===c?s.buttonText:s.small}>{c}</Text></Pressable>)}</View><Text style={s.note}>{suggestions(state,date,category).length} 組搭配 · 以每項食物一份計算。油、醬料與湯底未列出時不包含，請另行記錄。</Text>{!state.goals&&<Text");
ui=ui.replace('<View style={s.card} key={i}><Text style={s.overline}>搭配 {i+1} · 參考估值</Text><Text style={s.cardTitle}>{item.items.map(f=>f.name).join(\'＋\')}</Text>', '<View style={s.card} key={item.recipe.id}><Text style={s.overline}>{item.recipe.category} · 參考估值</Text><Text style={s.cardTitle}>{item.recipe.title}</Text>');
ui=ui.replace("...fresh(),type:'午餐',name:item.items.map(f=>f.name).join('＋')", "...fresh(),type:item.recipe.mealType,name:item.recipe.title");
fs.writeFileSync(native+'src/Main.tsx',ui);
fs.writeFileSync(web+'catalog.js','const mealCatalog = '+JSON.stringify(catalog)+';\n');
let app=fs.readFileSync(web+'app.js','utf8');
const a=app.indexOf('const foods='), b=app.indexOf('const round=',a);
app=app.slice(0,a)+"const foods=mealCatalog.foods.map(f=>[f.name,f.unit,f.cal,f.protein,f.carbs,f.fat]);\nlet ideaCategory='全部';\n"+app.slice(b);
const r=app.indexOf('function renderIdeas()');
app=app.slice(0,r)+`function renderIdeas(){
 const root=$('suggestions');root.replaceChildren();
 const filters=document.createElement('div');filters.className='idea-filters';
 for(const category of ['全部',...new Set(mealCatalog.recipes.map(r=>r.category))]){
  const button=document.createElement('button');button.textContent=category;button.className=ideaCategory===category?'selected':'';button.setAttribute('aria-pressed',String(ideaCategory===category));button.onclick=()=>{ideaCategory=category;renderIdeas();};filters.append(button);
 }
 root.append(filters);
 const recipes=mealCatalog.recipes.filter(r=>ideaCategory==='全部'||r.category===ideaCategory);
 const count=document.createElement('p');count.className='muted';count.textContent=recipes.length+' 組搭配 · 營養為參考估值，請依品牌與實際份量修正。未列出的油、醬料、湯底不包含，請另行記錄。';root.append(count);
 for(const recipe of recipes){
  const items=recipe.foodIds.map(id=>mealCatalog.foods.find(f=>f.id===id));
  const total={cal:0,carbs:0,protein:0,fat:0};for(const f of items)for(const key of Object.keys(total))total[key]+=f[key];
  const card=document.createElement('article');card.className='idea';
  const tag=document.createElement('span');tag.className='tag';tag.textContent=recipe.category+' · '+recipe.mealType;
  const title=document.createElement('h3');title.textContent=recipe.title;
  const portions=document.createElement('p');portions.textContent=items.map(f=>f.name+' '+f.unit).join('＋');
  const nutrition=document.createElement('p');nutrition.className='idea-nutrition';nutrition.textContent=round(total.cal)+' kcal · 碳水 '+round(total.carbs)+' g · 蛋白質 '+round(total.protein)+' g · 脂肪 '+round(total.fat)+' g';
  const button=document.createElement('button');button.textContent='調整份量並記錄 ↗';button.onclick=()=>{openEditor(null,recipe.mealType);$('meal-name').value=recipe.title;for(const key of Object.keys(total))$('meal-'+key).value=round(total[key]);};
  card.append(tag,title,portions,nutrition,button);root.append(card);
 }
}
render();
`;
fs.writeFileSync(web+'app.js',app);
let html=fs.readFileSync(web+'index.html','utf8').replace('<script src="app.js">','<script src="catalog.js"></script><script src="app.js">');
fs.writeFileSync(web+'index.html',html);
fs.appendFileSync(web+'style.css','\n.idea-filters{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.idea-filters button{border:1px solid #dce3d2;border-radius:22px;padding:8px 14px;font-size:12px;background:#fff}.idea-filters button.selected{background:#36543f;color:#fff;border-color:#36543f}.idea .idea-nutrition{background:#edf2e5;border-radius:12px;padding:12px;color:#4b6545;font-size:12px}\n');
