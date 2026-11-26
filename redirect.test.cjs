const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{createServer}=require('./serve.cjs');
const oldSource=fs.readFileSync(path.join(__dirname,'fixtures/sw-before-redirect.js'),'utf8');
const newSource=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
const fixture={meals:[{id:'keep-me',date:'2026-11-26',type:'午餐',name:'舊餐點',servings:1,cal:200,protein:20,carbs:30}],goals:null};
let mode='old',redirect='canonical';
const handler=createServer().listeners('request')[0];
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.setHeader('Cache-Control','no-store');return res.end(mode==='old'?oldSource:newSource);}
 if(pathname==='/index.html'){res.writeHead(302,{Location:redirect==='canonical'?'/':'/signin'});return res.end();}
 if(pathname==='/signin'){res.setHeader('Content-Type','text/html');return res.end('<h1>Sign in required</h1>');}
 if(redirect==='asset-login'&&pathname==='/style.css'){res.writeHead(302,{Location:'/signin'});return res.end();}
 handler(req,res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
  const oldContext=await browser.newContext();let broken=await oldContext.newPage();
  await broken.goto(base+'/');await broken.evaluate(data=>localStorage.setItem('daily-balance-v1',JSON.stringify(data)),fixture);
  await broken.evaluate(()=>navigator.serviceWorker.ready);
  const redirected=await broken.evaluate(async()=>{const names=await caches.keys();const c=await caches.open(names.find(n=>n.startsWith('daily-balance-shell-')));return(await c.match(new URL('index.html',location.href))).redirected;});
  assert.equal(redirected,true);
  let failed=false;try{await broken.reload({timeout:10000});}catch{failed=true;}
  assert.equal(failed,true,'Old cache must reproduce navigation failure');console.log('PASS reproduced old Service Worker redirect navigation failure');
  mode='new';redirect='login';broken=await oldContext.newPage();await broken.goto(base+'/recover.html');await broken.locator('#repair').click();
  await broken.waitForFunction(()=>!document.getElementById('repair').disabled,{},{timeout:20000});
  assert.ok(!(await broken.locator('#status').textContent()).startsWith('更新完成'));
  assert.deepEqual(await broken.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),fixture);
  console.log('PASS failed recovery does not claim success or change records');
  redirect='canonical';await broken.locator('#repair').click();
  await broken.waitForFunction(()=>document.getElementById('status').textContent.startsWith('更新完成'),{},{timeout:20000});
  assert.deepEqual(await broken.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),fixture);
  await broken.locator('#return').click();assert.equal(await broken.locator('#add').isVisible(),true);
  const entries=await broken.evaluate(async()=>{const names=await caches.keys();const c=await caches.open(names.find(n=>n.startsWith('daily-balance-shell-')));const keys=await c.keys();return Promise.all(keys.map(async k=>({url:k.url,redirected:(await c.match(k)).redirected})));});
  assert.equal(entries.length,14);assert.ok(entries.every(e=>e.redirected===false));
  await oldContext.setOffline(true);await broken.reload();assert.equal(await broken.locator('#add').isVisible(),true);
  assert.deepEqual(await broken.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),fixture);
  console.log('PASS recovery page replaces broken worker without deleting records; canonical redirects cached safely; offline reload succeeds');
  await oldContext.close();
  for(const variant of ['login','asset-login']){
   redirect=variant;const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'/');
   await page.evaluate(data=>localStorage.setItem('daily-balance-v1',JSON.stringify(data)),fixture);
   await page.waitForFunction(async()=>{const regs=await navigator.serviceWorker.getRegistrations();return regs.length===0||regs.every(r=>!r.active&&(!r.installing||r.installing.state==='redundant'));});
   // Allow the page's register() attempt to finish; then explicitly test the worker.
   const result=await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.register('./sw.js');const worker=reg.installing||reg.waiting||reg.active;
    if(!worker)return 'no-worker';if(worker.state==='redundant')return 'redundant';
    return new Promise(resolve=>{worker.addEventListener('statechange',()=>{if(['redundant','activated'].includes(worker.state))resolve(worker.state);});});
   });
   assert.equal(result,'redundant');
   const cached=await page.evaluate(async()=>{const names=await caches.keys();return names.filter(n=>n.startsWith('daily-balance-shell-'));});assert.equal(cached.length,0);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('daily-balance-v1'))),fixture);
   await context.close();console.log('PASS rejects '+variant+' redirect without caching login HTML or changing records');
  }
  console.log('Completed 5 redirect/recovery checks.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
