const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createServer}=require('./serve.cjs');
const old={meals:[{id:'legacy',date:'2026-11-13',type:'午餐',name:'舊餐點',cal:200,protein:30,carbs:4,servings:1}],goals:{cal:1800,protein:90,carbs:200}};
const results=[];
async function check(name,fn){await fn();results.push('PASS '+name);console.log(results.at(-1));}
(async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,acceptDownloads:true});
    let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/diary/');
    await page.evaluate(data=>localStorage.setItem('daily-balance-v1',JSON.stringify(data)),old);
    await page.reload();await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    await check('old storage survives load; missing fat stays unknown',async()=>{
      await page.locator('#date').fill('2026-11-13');await page.locator('#date').dispatchEvent('change');
      assert.match(await page.locator('#meals').textContent(),/舊餐點/);
      assert.match(await page.locator('#fat-note').textContent(),/1 筆/);
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),old);
      await page.getByRole('button',{name:/舊餐點/}).click();await page.locator('#meal-name').fill('編輯舊餐點');await page.locator('#meal-form button[type=submit]').click();
      assert.equal(await page.evaluate(()=>Object.hasOwn(JSON.parse(localStorage.getItem('daily-balance-v1')).meals[0],'fat')),false);
    });
    await check('manifest and all icons work below /diary/; sky-blue mobile layout fits',async()=>{
      const manifest=await page.evaluate(async()=>await(await fetch('./manifest.webmanifest')).json());
      assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
      for(const icon of manifest.icons){const res=await context.request.get(origin+'/diary/'+icon.src);assert.equal(res.status(),200);const b=await res.body();assert.equal(b.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
      assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(240, 249, 255)');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    });
    await check('offline reload, search, save and reload persist meals',async()=>{
      await context.setOffline(true);await page.reload();await page.locator('#add').click();
      await page.locator('[data-mode=search]').click();await page.locator('#search').fill('雞');assert.ok(await page.locator('#results button').count()>0);
      await page.locator('[data-mode=manual]').click();await page.locator('#meal-name').fill('離線便當');
      for(const [key,value] of Object.entries({cal:'600',protein:'30',carbs:'70',fat:'20'}))await page.locator('#meal-'+key).fill(value);
      await page.locator('#meal-form button[type=submit]').click();await page.reload();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1')).meals.length),2);
      assert.equal(await page.locator('#ai-analyze').isDisabled(),true);
    });
    let backup;
    await check('offline JSON/CSV downloads contain records and UTF-8 BOM',async()=>{
      const promise=page.waitForEvent('download');await page.locator('#backup-json').click();const file=await promise;backup=fs.readFileSync(await file.path(),'utf8');assert.equal(JSON.parse(backup).data.meals.length,2);
      const p=page.waitForEvent('download');await page.locator('#export-csv').click();const csv=fs.readFileSync(await(await p).path());assert.deepEqual([...csv.subarray(0,3)],[239,187,191]);assert.ok(csv.toString().includes('離線便當'));
    });
    const upload=async text=>page.locator('#restore-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
    await check('restore preview, confirm and repeated import are safe offline',async()=>{
      const incoming=JSON.parse(backup);incoming.data.meals.push({...old.meals[0],id:'imported',name:'還原餐點'});
      await upload(JSON.stringify(incoming));await page.waitForFunction(()=>!document.getElementById('restore-confirm').disabled);
      assert.equal(await page.evaluate(()=>state.meals.length),2);await page.locator('#restore-confirm').click();assert.equal(await page.evaluate(()=>state.meals.length),3);
      await upload(JSON.stringify(incoming));await page.waitForFunction(()=>!document.getElementById('restore-confirm').disabled);await page.locator('#restore-confirm').click();assert.equal(await page.evaluate(()=>state.meals.length),3);
      assert.match(await page.locator('#backup-status').textContent(),/重複 3 筆/);
    });
    await check('invalid JSON makes zero writes; conflicts preserve original',async()=>{
      const before=await page.evaluate(()=>localStorage.getItem(key));await upload('{');await page.waitForFunction(()=>document.getElementById('backup-status').textContent.startsWith('未匯入'));
      assert.equal(await page.evaluate(()=>localStorage.getItem(key)),before);assert.equal(await page.locator('#restore-confirm').isDisabled(),true);
      await upload(JSON.stringify({meals:[{...old.meals[0],name:'不應覆蓋'}],goals:null}));await page.waitForFunction(()=>!document.getElementById('restore-confirm').disabled);await page.locator('#restore-confirm').click();assert.equal(await page.evaluate(()=>localStorage.getItem(key)),before);
    });
    await check('JSON backup restores meals and goals into empty storage offline',async()=>{
      await page.evaluate(()=>localStorage.removeItem('daily-balance-v1'));await page.reload();
      await upload(backup);await page.waitForFunction(()=>!document.getElementById('restore-confirm').disabled);await page.locator('#restore-confirm').click();
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),JSON.parse(backup).data);
    });
    await check('quota failure and stale tab cannot claim a successful save',async()=>{
      const result=await page.evaluate(()=>{const original=Storage.prototype.setItem,before=state;Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};const ok=save({...state,goals:null});Storage.prototype.setItem=original;return {ok,same:state===before};});assert.deepEqual(result,{ok:false,same:true});
      const other=await context.newPage();await other.goto(origin+'/diary/');await other.evaluate(()=>{const data=JSON.parse(localStorage.getItem('daily-balance-v1'));data.meals.push({...data.meals[0],id:'other-tab'});localStorage.setItem('daily-balance-v1',JSON.stringify(data));});
      assert.equal(await page.evaluate(()=>save({...state,goals:null})),false);await other.close();await page.reload();
    });
    await context.setOffline(false);
    await check('update waits with form open, then activates after windows close; records survive',async()=>{
      await page.locator('#add').click();await page.locator('#meal-name').fill('尚未儲存');
      const swPath=path.join(__dirname,'sw.js'),source=fs.readFileSync(swPath,'utf8');
      try{
        fs.writeFileSync(swPath,source.replace("2026-11-26-1","2026-11-26-test"));
        await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
        await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
        assert.equal(await page.locator('#meal-name').inputValue(),'尚未儲存');assert.equal(await page.locator('#editor').evaluate(e=>e.open),true);
        const before=await page.evaluate(()=>localStorage.getItem(key));await page.close();page=await context.newPage();await page.goto(origin+'/diary/');
        await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r.active?.state==='activated'&&!r.waiting;});
        assert.equal(await page.evaluate(()=>localStorage.getItem(key)),before);
        const cacheNames=await page.evaluate(()=>caches.keys());assert.equal(cacheNames.filter(n=>n.includes('daily-balance-shell-')).length,1);
      }finally{fs.writeFileSync(swPath,source);}
    });
    await check('corrupt existing storage is preserved and writes blocked',async()=>{
      await page.evaluate(()=>localStorage.setItem('daily-balance-v1','{bad'));await page.reload();assert.equal(await page.evaluate(()=>save({meals:[],goals:null})),false);assert.equal(await page.evaluate(()=>localStorage.getItem(key)),'{bad');
      await page.evaluate(data=>localStorage.setItem('daily-balance-v1',JSON.stringify(data)),old);await page.reload();
    });
    await check('root path installation and offline opening also work',async()=>{
      const rootContext=await browser.newContext();const rootPage=await rootContext.newPage();
      await rootPage.goto(origin+'/');await rootPage.evaluate(()=>navigator.serviceWorker.ready);await rootPage.reload();
      await rootContext.setOffline(true);await rootPage.reload();assert.equal(await rootPage.locator('#add').isVisible(),true);await rootContext.close();
    });
    await page.screenshot({path:path.join(__dirname,'mobile-preview.png'),fullPage:true});assert.deepEqual(errors,[]);
    console.log(`Completed ${results.length} browser checks; zero page errors.`);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
