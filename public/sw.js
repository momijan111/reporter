// 電波がないところでもアプリを開けるようにする仕組み（サービスワーカー）。
// 一度開いたファイルを端末にためておき、つながらないときはそれを使う。

const CACHE_NAME = 'hospital-log-v1'

self.addEventListener('install', (event) => {
  // 新しいバージョンをすぐ使えるようにする
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 別のサイトのファイルは扱わない
  if (url.origin !== self.location.origin) return

  // ページそのものは「まずネット、だめならためたもの」
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (
            (await cache.match(request)) ||
            (await cache.match('./index.html')) ||
            Response.error()
          )
        }),
    )
    return
  }

  // それ以外（JS・CSS・画像）は「まずためたもの、なければネット」
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
