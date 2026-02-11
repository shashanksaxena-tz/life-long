var CACHE_NAME = 'life-long-v2';
var URLS_TO_CACHE = [
  './',
  'index.html',
  'projects.html',
  'tasks.html',
  'logs.html',
  'ideas.html',
  'goals.html',
  'habits.html',
  'style.css',
  'utils.js',
  'app.js',
  'manifest.json',
  'data/index.json'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});
