let socket = new WebSocket("ws://localhost:9500/"),
    log = document.getElementById('log');
socket.onopen = function (e) {
    console.log('okay we opened a connection');
};
socket.onmessage = function (e) {
    console.log('we have a message');
    let data = e.data + '';
    console.log(data);
    if (data.trim().startsWith("qr_ready:")) {
        let path = data.replace('qr_ready:', '');
        setTimeout(() => {
            let img = document.querySelector('#qr_img');
            let loading = document.querySelector('#pnl_loading');
            let caption = document.querySelector('#pnl_caption');
            loading.classList.add('hidden');
            img.classList.remove('hidden');
            caption.classList.remove('hidden');
            img.src = path;
        }, 1000);
    }
};
socket.onclose = function (e) {
    console.log('socket closed')
    if (e.wasClean) {
        console.log('clean close');
        console.log(e.code);
        console.log(e.reason);
    } else {
        console.log('conection died');
        console.log(e.code);
    }
};
