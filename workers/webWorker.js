onmessage = (e) => {
    let url = e.data[0];;
    let funcName = e.data[1];
    let result = {};
    fetch(url)
    .then(response => response.json())
    .then((res) => {
        result = [];
        result.push(res);
        result.push(funcName);
        let obj = JSON.parse(JSON.stringify(result));
        return obj;
    })
    .then(self.postMessage)
    .catch(err => console.log(err));
}