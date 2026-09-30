// 生成AIパスポート問題集：オフライン用キャッシュ
const CACHE="gaip-v1";
const CORE=["./","index.html","manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url);
  // フォント：一度取得したらキャッシュから
  if(u.hostname.endsWith("googleapis.com")||u.hostname.endsWith("gstatic.com")){
    e.respondWith(caches.open(CACHE).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{c.put(r,res.clone());return res}).catch(()=>hit))));return}
  if(u.origin!==location.origin)return;
  // ページ本体：通信できれば最新版を取得して保存、圏外ならキャッシュ
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res})
    .catch(()=>caches.match(r).then(h=>h||caches.match("index.html"))));
});
