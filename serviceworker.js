// serviceworker registration to work in offline
if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then((reg) => {
        console.log('Serviceworker registration succeeded');
    })
    .catch((error) => {
        console.log('Registration failed with' + error);
    });
}