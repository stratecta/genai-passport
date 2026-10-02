// 生成AIパスポート問題集：オフライン用キャッシュ
const CACHE="gaip-v8";
const AUDIO="gaip-audio"; // 音声ファイル（バージョン更新でも消さない）
const CORE=["./","index.html","manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==AUDIO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

// 保存済みの音声から、Range指定に合わせた206応答を作る（iPhoneの音声再生に必要）
async function rangeResponse(cached,rangeHeader){
  const buf=await cached.arrayBuffer();const size=buf.byteLength;
  const m=/bytes=(\d*)-(\d*)/.exec(rangeHeader||"");
  if(!m)return new Response(buf,{status:200,headers:{"Content-Type":"audio/mpeg","Content-Length":String(size),"Accept-Ranges":"bytes"}});
  let start=m[1]===""?Math.max(0,size-Number(m[2])):Number(m[1]);
  let end=m[1]!==""&&m[2]!==""?Math.min(Number(m[2]),size-1):size-1;
  if(start>=size)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+size}});
  return new Response(buf.slice(start,end+1),{status:206,headers:{"Content-Type":"audio/mpeg","Content-Length":String(end-start+1),"Content-Range":"bytes "+start+"-"+end+"/"+size,"Accept-Ranges":"bytes"}});
}
async function handleAudio(req){
  const url=new URL(req.url);const key=url.pathname.replace(/^.*\/(audio|listen)\//,"$1/"); // "audio/chN.mp3" / "listen/qa1.mp3"
  const c=await caches.open(AUDIO);
  const hit=await c.match(key);
  if(hit)return rangeResponse(hit,req.headers.get("range"));
  // 未保存：ネットから再生しつつ、裏でファイル全体を保存
  fetch(key,{cache:"no-store"}).then(r=>{if(r.ok&&r.status===200)return c.put(key,r)}).catch(()=>{});
  return fetch(req);
}
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.hostname.endsWith("googleapis.com")||u.hostname.endsWith("gstatic.com")){
    e.respondWith(caches.open(CACHE).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{c.put(r,res.clone());return res}).catch(()=>hit))));return}
  if(u.origin!==location.origin)return;
  if((u.pathname.includes("/audio/")||u.pathname.includes("/listen/"))&&u.pathname.endsWith(".mp3")){e.respondWith(handleAudio(r));return}
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res})
    .catch(()=>caches.match(r).then(h=>h||caches.match("index.html"))));
});
