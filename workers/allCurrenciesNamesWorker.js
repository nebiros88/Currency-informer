onmessage = (e) => {
    fetch(e.data)
    .then(response => response.json())
    .then(self.postMessage)
    .catch(err => console.log(err));
}

