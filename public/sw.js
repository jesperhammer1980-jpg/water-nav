const CACHE_NAME='waternav-v45.9';
const ASSETS=['./','./index.html?v=45.9','./style.css?v=45.9','./app.js?v=45.9','./manifest.json?v=45.9','./icons/waternav-192.png?v=45.9','./icons/waternav-512.png?v=45.9','./data/tiles/ddm-tile-manifest.json?v=45.9','./data/ddm-tile-verification.json?v=45.9','./data/ddm-verification.json?v=45.9','./data/ddm-denmark-verification.json?v=45.9'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waternav-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
