/* Bump RELEASE whenever any shell asset changes. No meal data or API caching. */
const RELEASE='2026-11-26-3';
const PREFIX='daily-balance-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+RELEASE;
const SHELL=['./','index.html','style.css','catalog.js','mixer.js','app.js','photo-ai.js','data-tools.js','pwa.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'];
const SCOPE=new URL(self.registration.scope);
function expectedType(path){
  if(path==='./'||path==='index.html')return /text\/html/i;
  if(path.endsWith('.js'))return /(?:text|application)\/(?:java|ecma)script/i;
  if(path.endsWith('.css'))return /text\/css/i;
  if(path.endsWith('.png'))return /image\/png/i;
  return /application\/(?:manifest\+)?json/i;
}
async function checkedResponse(response,path){
  const requested=new URL(path,SCOPE),finalURL=new URL(response.url||requested.href);
  const document=path==='./'||path==='index.html';
  const allowedPath=document?[SCOPE.pathname,new URL('index.html',SCOPE).pathname]:[requested.pathname];
  if(response.status!==200||finalURL.origin!==SCOPE.origin||!allowedPath.includes(finalURL.pathname)||!expectedType(path).test(response.headers.get('content-type')||''))throw Error('Unexpected shell response');
  const headers=new Headers(response.headers);
  for(const h of ['content-encoding','content-length','location'])headers.delete(h);
  let body=response.body;
  if(document){
    body=await response.text();
    if(!body.includes('id="dashboard"')||!body.includes('id="meal-form"'))throw Error('Not the diary page');
  }
  // Redirect history survives Cache Storage. A fresh Response is safe for navigation.
  return new Response(body,{status:200,statusText:'OK',headers});
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const entries=await Promise.all(SHELL.map(async path=>{
      const response=await fetch(new Request(new URL(path,SCOPE),{cache:'reload',credentials:'same-origin'}));
      return [new URL(path,SCOPE),await checkedResponse(response,path)];
    }));
    const cache=await caches.open(CACHE);
    await Promise.all(entries.map(([url,response])=>cache.put(url,response)));
  })());
  // Leave updates waiting until all old windows close; never reload a meal form.
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  // Explicit recovery only; never reload an editor or touch meal storage.
  if(event.data?.type==='UPDATE_OFFLINE')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='CHECK_OFFLINE_VERSION')event.ports[0]?.postMessage({version:RELEASE});
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url),scope=new URL(self.registration.scope);
  if(req.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative=url.pathname.slice(scope.pathname.length);
  if(req.mode==='navigate'){
    if(relative!==''&&relative!=='index.html')return;
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const cached=await cache.match(new URL('index.html',scope));
      if(!cached)return fetch(req);
      return cached.redirected?checkedResponse(cached,'index.html'):cached;
    }));
  }else if(SHELL.includes(relative)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL(relative,scope)))||fetch(req)));
  }
});
