const CACHE_NAME='waternav-v46.1';
const ASSETS=['./','./index.html?v=46.1','./style.css?v=46.1','./app.js?v=46.1','./manifest.json?v=46.1','./icons/waternav-192.png?v=46.1','./icons/waternav-512.png?v=46.1','./data/tiles/ddm-tile-manifest.json?v=46.1','./data/ddm-tile-verification.json?v=46.1','./data/ddm-verification.json?v=46.1','./data/ddm-denmark-verification.json?v=46.1'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waternav-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
