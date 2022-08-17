"use strict";

/**
 * YaMa Service Worker
 * 
 * Caches static files and network requests
 * https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker
 */


const CACHE_NAME = "yama";
const PWA_VERSION = "2022-05-29"
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/global.css",
    "/offline.html",
    "/build/bundle.css",
    "/build/bundle.js",
    "/smui-dark.css",
    "/smui.css",
    "/favicon.png"
];

/**
 * Install the ServiceWorker and create the Cache
 *  - Save set static files to cache (FILES_TO_CACHE) 
 */
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");
  event.waitUntil(
    caches.open(CACHE_NAME+'-'+PWA_VERSION).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/**
 * Activate a new ServiceWorker version - Delete old cache assets
 *  - With the strategy chosen, cached assets do not get updated in cache 
 *      until a new version of the ServiceWorker is created!
 */
self.addEventListener('activate', function(event) {
    console.log("[ServiceWorker] Activate");
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
           return cacheName !== CACHE_NAME+'-'+PWA_VERSION // TRUE if we want to remove the cache
          }).map(function(cacheName) {
            console.log('[ServiceWorker] ' + cacheName + ' deleted to make way for new cache.')
            return caches.delete(cacheName);
          })
        );
      })
    );
});


/**
 * Listen for fetch events
 *  - Return anything that has been cached
 *  - Get anything not in the cache from the network
 *  - Provide custom fallbacks for items that can not be retrieved from the network 
 */
self.addEventListener("fetch", (event) => {
  console.log("[ServiceWorker] Fetch", event.request.url, event.request.mode);
  event.respondWith(
    caches.open(CACHE_NAME+'-'+PWA_VERSION).then((cache) => {
        return cache.match(event.request).then( (response) => {
            if (response) {
                // Return Cache response found
                console.log('[ServiceWorker] '+ event.request.url + ' found in cache.')
                return response
            }
            // Not found In cache, try and get from network
            return fetch(event.request).then(function(response) {
                // Catch any expected network error status, else return the response
                if (response.status === 404) {
                  return caches.match('/offline.html');
                }
                // Cache any fonts
                if (response.url.endsWith('.woff2')) {
                    return cache.put(event.request, response.clone()).then( () => {
                        return response
                    });
                }
                return response
            });
        }).catch(function() {
            // If network suffers full failure - Return a generic error page
            return caches.match('/offline.html');
        })
    })
  );
});
