// Cybertech PDV - Offline Service Worker
const CACHE_NAME = "cybertech-pdv-v3";
const OFFLINE_URLS = [
  "/pdv",
  "/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn("[SW] Falha ao pré-carregar URLs offline:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignora chamadas de API, loja pública online ou extensões do Chrome
  if (
    req.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    url.pathname.startsWith("/loja") ||
    url.pathname.startsWith("/ecommerce")
  ) {
    return;
  }

  // Requisição de Navegação de Página (Ex: /pdv)
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Se estiver offline, retorna o /pdv em cache
          const cached = await caches.match(req);
          if (cached) return cached;
          const pdvFallback = await caches.match("/pdv");
          if (pdvFallback) return pdvFallback;
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cybertech PDV Offline</title></head><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>PDV em Modo Offline</h2><p>Sem conexão de rede. Reconecte o Wi-Fi ou cabo para sincronizar.</p><a href="/pdv" style="color:#38bdf8;">Tentar abrir PDV</a></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Arquivos estáticos do Next.js (_next/static, css, js, imagens)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2|woff)$/)
  ) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) {
          // Busca em background para atualizar o cache se tiver internet
          fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
              }
            })
            .catch(() => {});
          return cachedRes;
        }

        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cachedRes);
      })
    );
  }
});

