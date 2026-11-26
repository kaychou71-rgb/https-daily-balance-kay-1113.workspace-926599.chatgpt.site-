/* Bump RELEASE whenever any shell asset changes. No meal data or API caching. */
const RELEASE='2026-11-26-1';
const PREFIX='daily-balance-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+RELEASE;
const SHELL=['./','index.html','style.css','catalog.js','mixer.js','app.js','photo-ai.js','data-tools.js','pwa.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})));})());
  // Leave updates waiting until all old windows close; never reload a meal form.
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url),scope=new URL(self.registration.scope);
  if(req.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative=url.pathname.slice(scope.pathname.length);
  if(req.mode==='navigate'){
    if(relative!==''&&relative!=='index.html')return;
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL('index.html',scope)))||fetch(req)));
  }else if(SHELL.includes(relative)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL(relative,scope)))||fetch(req)));
  }
});
