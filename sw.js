/* Mi español — офлайн-кеш. Список файлов и версию обновляет tools/build_sw.py */
const VERSION="3c56d6ef1d";
const ASSETS=["./", "index.html", "styles.css", "app.js", "sync.js", "supabase-config.js", "manifest.webmanifest", "data/cards.json", "data/decks.json", "data/exercises.json", "data/facts.json", "data/flags.json", "data/icons.json", "data/lessons.json", "data/lex.json", "data/sobre.json", "data/stickers.json", "data/verbs.json", "img/bread.webp", "img/cathedral.webp", "img/dancers.webp", "img/fish.webp", "img/flag_sevilla.jpg", "img/flag_watercolor.webp", "img/flamenco.webp", "img/flowers.webp", "img/guitar_fan.webp", "img/heart_madrid.webp", "img/jamon.webp", "img/madrid_azulejo.webp", "img/malaga.webp", "img/nb_bike.webp", "img/nb_books.webp", "img/nb_flag.webp", "img/nb_hearts.webp", "img/nb_house.webp", "img/nb_stamp.webp", "img/oranges.webp", "img/paella.webp", "img/palacio_cristal.webp", "img/poster_alhambra.jpg", "img/sevilla.webp", "img/spain_plate.webp", "img/spain_tile.webp", "img/stamp_sagrada.webp", "fonts/SoyuzGrotesk-Bold.ttf", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
const CACHE="mi-espanol-"+VERSION, FONTS="mi-espanol-fonts";

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  // Google Fonts: кеш, потом сеть
  if(url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==="opaque")c.put(req,r.clone());return r}))));
    return;
  }
  if(url.origin!==location.origin)return;
  // свои файлы: сразу из кеша, в фоне обновляем
  e.respondWith(caches.open(CACHE).then(c=>c.match(req,{ignoreSearch:true}).then(hit=>{
    const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit||(req.mode==="navigate"?c.match("index.html"):undefined));
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net;
  })));
});
