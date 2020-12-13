self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('v1').then(function(cache) {
            return cache.addAll([
                '../',
                '../index.html',
                '../css/style.css',
                '../app.js',
                '../img/euro.png',
                '../img/greenArrow.png',
                '../img/redArrow.png',
                '../img/russia.png',
                '../img/usa.png',
                '../workers/current_rates_worker.js',
                '../workers/yesterdayRatesWorker.js'
            ])
        }) 
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
        .then((resp) => {
            if(resp) {
                return resp;
            }
            return fetch(event.request);
        })
    );
});
