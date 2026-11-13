const mixSelection=new Map();
let mixType='午餐',mixQuery='';
function nutritionText(n){return `${round(n.cal)} kcal · 蛋白質 ${round(n.protein)} g · 碳水 ${round(n.carbs)} g · 脂肪 ${round(n.fat)} g`;}
function selectedMix(){return [...mixSelection].map(([id,raw])=>{const food=mealCatalog.foods.find(f=>f.id===id),qty=Number(raw);if(!food||!String(raw).trim()||!Number.isFinite(qty)||qty<.1||qty>100)throw Error('請輸入 0.1–100 份');return {food,qty};});}
function mixTotals(items){const n={cal:0,protein:0,carbs:0,fat:0};for(const {food,qty} of items)for(const k of Object.keys(n))n[k]+=food[k]*qty;return n;}
function toggleMix(id){if(mixSelection.has(id))mixSelection.delete(id);else mixSelection.set(id,'1');renderIdeas();}
function updateMixTotal(){try{const items=selectedMix();$('mix-total').textContent=nutritionText(mixTotals(items));$('mix-save').disabled=!items.length;}catch{$('mix-total').textContent='請修正份數後再計算總和。';$('mix-save').disabled=true;}}
function renderIdeas(){
 const root=$('suggestions');root.replaceChildren();
 const summary=document.createElement('article');summary.className='mix-summary';
 const heading=document.createElement('h3');heading.textContent=`我的組合 · ${mixSelection.size} 項`;
 const date=document.createElement('p');date.className='muted';date.textContent='儲存日期：'+$('date').value+' · 同種食物只計一次，可調整份數。';summary.append(heading,date);
 if(!mixSelection.size){const empty=document.createElement('p');empty.textContent='從下方勾選食物，開始組合這一餐。';summary.append(empty);}
 for(const [id,raw] of mixSelection){
  const food=mealCatalog.foods.find(f=>f.id===id);const row=document.createElement('div');row.className='mix-picked';
  const name=document.createElement('b');name.textContent=food.name+' · '+food.unit+'／份';
  const controls=document.createElement('div');controls.className='mix-controls';const label=document.createElement('label');label.textContent='份數';
  const qty=document.createElement('input');qty.type='number';qty.min='.1';qty.max='100';qty.step='.1';qty.value=raw;qty.setAttribute('aria-label',food.name+'份數');label.append(qty);
  const remove=document.createElement('button');remove.textContent='移除';remove.setAttribute('aria-label','移除'+food.name);remove.onclick=()=>toggleMix(id);controls.append(label,remove);
  const subtotal=document.createElement('p');subtotal.className='muted';
  const update=()=>{const n=Number(qty.value);subtotal.textContent=qty.value.trim()&&Number.isFinite(n)&&n>=.1&&n<=100?nutritionText(mixTotals([{food,qty:n}])):'請輸入 0.1–100 份';};
  qty.oninput=()=>{mixSelection.set(id,qty.value);update();updateMixTotal();};update();row.append(name,controls,subtotal);summary.append(row);
 }
 const title=document.createElement('h3');title.textContent='整餐總和';const total=document.createElement('p');total.id='mix-total';total.setAttribute('aria-live','polite');total.className='idea-nutrition';
 const typeLabel=document.createElement('label');typeLabel.textContent='存入餐別';const type=document.createElement('select');type.setAttribute('aria-label','組合餐別');for(const name of ['早餐','午餐','晚餐','點心']){const option=document.createElement('option');option.value=option.textContent=name;type.append(option);}type.value=mixType;type.onchange=()=>mixType=type.value;typeLabel.append(type);
 const saveButton=document.createElement('button');saveButton.id='mix-save';saveButton.className='primary';saveButton.textContent='將組合存入餐點';saveButton.onclick=()=>{try{const items=selectedMix();if(!items.length)return;const meals=items.map(({food,qty})=>({id:crypto.randomUUID(),date:$('date').value,type:mixType,name:food.name+'（'+food.unit+'／份）',servings:qty,cal:food.cal,protein:food.protein,carbs:food.carbs,fat:food.fat}));if(save({...state,meals:[...state.meals,...meals]})){mixSelection.clear();render();toast(`已將 ${meals.length} 項食物存入${mixType}`);}}catch(e){toast(e.message);}};
 summary.append(title,total,typeLabel,saveButton);root.append(summary);
 const filters=document.createElement('div');filters.className='idea-filters';
 for(const category of ['自由選食物','全部',...new Set(mealCatalog.recipes.map(r=>r.category))]){const button=document.createElement('button');button.textContent=category;button.className=ideaCategory===category?'selected':'';button.setAttribute('aria-pressed',String(ideaCategory===category));button.onclick=()=>{ideaCategory=category;renderIdeas();};filters.append(button);}root.append(filters);
 const note=document.createElement('p');note.className='muted';note.textContent='每項顯示一份的營養估值。可跨搭配勾選；未列出的油、醬料、湯底需另外記錄。';root.append(note);
 const foodRow=food=>{const row=document.createElement('label');row.className='mix-food'+(mixSelection.has(food.id)?' checked':'');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=mixSelection.has(food.id);checkbox.setAttribute('aria-label','選擇'+food.name);checkbox.onchange=()=>toggleMix(food.id);const info=document.createElement('span');const name=document.createElement('b');name.textContent=food.name;const portion=document.createElement('small');portion.textContent='每份 '+food.unit;const nutrition=document.createElement('small');nutrition.textContent=nutritionText(food);info.append(name,portion,nutrition);row.append(checkbox,info);return row;};
 if(ideaCategory==='自由選食物'){
  const input=document.createElement('input');input.placeholder='搜尋食物名稱';input.setAttribute('aria-label','搜尋可搭配食物');input.value=mixQuery;const list=document.createElement('div');
  const renderList=()=>{list.replaceChildren();const matches=mealCatalog.foods.filter(f=>f.name.includes(mixQuery.trim()));for(const food of matches)list.append(foodRow(food));if(!matches.length)list.textContent='找不到符合的食物，試試其他字詞。';};input.oninput=()=>{mixQuery=input.value;renderList();};root.append(input,list);renderList();
 }else{
  for(const recipe of mealCatalog.recipes.filter(r=>ideaCategory==='全部'||r.category===ideaCategory)){const card=document.createElement('article');card.className='idea';const tag=document.createElement('span');tag.className='tag';tag.textContent=recipe.category;const title=document.createElement('h3');title.textContent=recipe.title;card.append(tag,title);for(const id of recipe.foodIds)card.append(foodRow(mealCatalog.foods.find(f=>f.id===id)));root.append(card);}
 }
 updateMixTotal();
}
