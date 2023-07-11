const express = require("express");
const Router = require("./src/router");
const WhatsApp_API = require("./src/plugins/whatsapp");
const checknet = require('./src/plugins/internet-check.js');
const path = require('path');
const chalk = require("chalk");
const fs = require('fs');
// Begin init socket
let app = express();
var qr_image_path = "";
Router(app);

const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({
    port: 9500,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});

wss.on('connection', function connection(ws) {
    console.log(chalk.green("We have a new user: " + wss.clients.size));
    ws.on('error', console.error);
    ws.on('message', function message(data) {
        console.log('Received: %s', data);
    });
});

//End init socket
let wweb = new WhatsApp_API('./src/cache');

wweb.setSocket(wss);
wweb.setListener(file => {
    qr_image_path = file;
    console.log('Callback file: ' + file);
});
wweb.setOnReady(() => {
    console.log(chalk.bold.green("Client is ready"));
    wss.clients.forEach(client => client.send("CMD:connected"));
});
wweb.setOnSignout(() => {
    wss.clients.forEach(client => client.send("CMD:disconnected"));
});
wweb.init('./src/cache');
app.get("/qr", (req, res) => {
    checknet().then(v => {
        const data = { title: "No file" };
        if (wweb.client_status) res.status(200).render("client_ready");
        else res.status(200).render('qr', data);
    }).catch(() => {
        res.status(200).render('no_internet');
        wss.clients.forEach(client => client.send("CMD:nointernet"));
    });
});

app.get("/static_qr", (req, res) => {
    //console.log(qr_image_path);
    checknet().then(v => {
        if (wweb.client_status)
            res.status(200).render("client_ready");
        else
            res.status(200).render('static_qr', { qr_path: qr_image_path })
    }).catch(() => {
        res.status(200).render('no_internet');
        wss.clients.forEach(client => client.send("CMD:nointernet"));
    });
});

app.post('/api/sendText', async (req, res) => {
    try {
        await checknet();
    } catch {
        console.log(chalk.red('Can\'t Sent Message, No Internet Connection.'));
        res.status(400).send("no internet connection");
        wss.clients.forEach(client => client.send("CMD:nointernet"));
        return;
    }
    if (!wss.client_status) {
        console.log(chalk.cyan('Client is not ready'));
        res.status(400).send("غير متصل");
        return;
    }
    const { phone, message } = req.body;
});

app.post("/api/sendPdf", async (req, res) => {
    // checknet().then(async (v) => {
   
    if (!wweb.client_status) {
        res.status(400).send("Client is not ready");
        return;
    }
    try {
        await checknet();
    } catch {
        console.log(chalk.red('Can\'t Sent File, No Internet Connection.'));
        res.status(400).send("no internet connection");
        wss.clients.forEach(client => client.send("CMD:nointernet"));
        return;
    }
    if (!wweb.client_status) {
        console.log(chalk.cyan('Client is not ready'));
        res.status(400).send("غير متصل");
        return;
    }
    const { phone, path, caption } = req.body;
    if (!fs.existsSync(path)) {
        console.log("file not exists");
        res.status(400).send("الملف غير موجود");
        return { error: "file not exist" };
    } else console.log("file exists");
    res.status(200).send("file sending");
    let response = await wweb.sendFile(phone, path, caption);

    // if (!response || response.error) res.status(400).send(res.error);
    // else res.status(200).send(res.body);
});

app.get('/api/check_internet', (req, res) => {
    checknet().then(() => {
        res.status(200).send("Connected");
    }).catch(() => {
        wss.clients.forEach(client => client.send("CMD:nointernet"));
        res.status(400).send("Not Connected");
    });
});

app.get('/api/get_status', async (req, res) => {
    try {
        await checknet();
        if (!wweb.client_status) { res.status(401).send(4); return; }
    } catch {
        wss.clients.forEach(client => client.send("CMD:nointernet"));
        res.status(400).send(5);
    }

});

app.get('/api/check_ws', (req, res) => {
    wss.emit('welcome', "B3lal");
    wss.clients.forEach(client => client.send("Welcome"));
    res.status(200).send("sended");
});

app.get('/api/check', (req, res) => res.status(200).send("found"));

app.listen(app.get('port'), () => {
    console.log(chalk.magenta(`Worker ${process.pid} Running a Http Server Listening On Port ${app.get('port')}`));
});

