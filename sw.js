let dataCacheName = 'v1';

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
    let dataUrl = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';
    if(event.request.url.indexOf(dataUrl) === 0) {
        // Data handler cod will be here
        event.respondWith(
            fetch(event.request)
            .then(function(response) {
                return caches.open(dataCacheName).then(function(cache) {
                    cache.put(event.request.url, response.clone());
                    return response
                });
            })
        )
    } else {
        event.respondWith(
            caches.match(event.request)
            .then((resp) => {
                if(resp) {
                    return resp;
                }
                return fetch(event.request);
            })
        );
    }
    
});