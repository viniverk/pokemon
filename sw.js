/* Service worker do Registro de cartas.
   Estratégia: rede primeiro, cache como rede de segurança.
   Assim uma edição no index.html aparece na próxima abertura, sem ficar
   presa numa versão antiga. Suba o número da versão ao publicar mudanças. */

const VERSAO = "cartas-v6";

const CASCA = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(CASCA))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;

  // Só cuida dos arquivos do próprio app. Firestore, autenticação e imagens
  // de carta seguem direto para a rede, sem passar por cache.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(resp => {
        const copia = resp.clone();
        caches.open(VERSAO).then(c => c.put(req, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
