const CACHE_NAME='waternav-v45.5';
const ASSETS=['./','./index.html?v=45.5','./style.css?v=45.5','./app.js?v=45.5','./manifest.json?v=45.5','./data/tiles/ddm-tile-manifest.json?v=45.5','./data/ddm-tile-verification.json?v=45.5','./data/ddm-verification.json?v=45.5','./data/ddm-denmark-verification.json?v=45.5'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waternav-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
