/* Service worker: التطبيق يفتح بدون نت، والتحديثات توصل أول ما يكون فيه نت */
const V = "mk-v3";
const SHELL = ["./", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon.svg"];
const STATIC_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || !/^https?:$/.test(u.protocol)) return;
  if (u.hostname.endsWith("supabase.co")) return; // البيانات والدخول دايمًا من السيرفر
  if (r.mode === "navigate") {
    // الصفحة: النت الأول (عشان التحديثات)، ولو مفيش نت النسخة المحفوظة
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put("./", c)); } return res; })
      .catch(() => caches.match("./").then(m => m || caches.match(r))));
    return;
  }
  if (u.origin === location.origin || STATIC_HOSTS.includes(u.hostname)) {
    // باقي الملفات: من الكاش فورًا وبتتحدّث في الخلفية
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
