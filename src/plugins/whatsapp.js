const fs = require("fs");
const path = require("path");
const qrter = require('qrcode-terminal');
const checknet = require('./internet-check.js');
const {
    Client,
    LocalAuth,
    MessageMedia
} = require('whatsapp-web.js');
const qrcode = require('qrcode');
const chalk = require("chalk");
const { Sifbase } = require("sifbase");
const { WebSocketServer } = require('ws');

class WhatsApp_API {
    /**
     * @public
     * @type {Boolean}
     */
    internet_status = false;
    client_status = false;
    qr_status = false;
    is_connecting = false;
    /**
     * @private
     * @type {WebSocketServer}
     */
    socket;
    /**
     * @type {Sifbase}
     */
    db;
    /**
     * @public
     * @type {Client}
     */
    client;
    path = '';
    /**
     * @type {Boolean}
     * @public
     */
    constructor(cache_path) {
        if (cache_path) this.path = cache_path;
    }
    clearCache() {
        //console.log(__dirname + "/" + this.path);
        let cr_path = this.path;
        if (!fs.existsSync(this.path)) {
            //console.log(cr_path);
            //cfs.mkdirSync(path.resolve(this.path));
            cr_path = path.join(__dirname, "../", "./cache");
            if (!fs.existsSync(cr_path)) fs.mkdirSync(cr_path, { recursive: true });
        }
        fs.readdir(cr_path, (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join(cr_path, file), (err) => {
                    if (err) throw err;
                });
            }
        });
    }
    init(cache_path) {
        this.db = new Sifbase(path.join(__dirname, "./data/contacts.json"));
        if (cache_path) this.path = cache_path;
        this.monitorClient();
        this.doConnection();
        this.clearCache();
    }
    async doConnection() {
        let net = await this.checkInternet();
        if (!net) {
            let wait = setInterval(async () => {
                net = await this.checkInternet();
                if (net) {
                    clearInterval(wait);
                    this.initNewClient();
                }
            }, 5000);
        } else this.initNewClient();
    }
    async monitorClient() {
        setInterval(async () => {
            try {
                await checknet();
                this.internet_status = true;
            } catch {
                this.internet_status = false;
            }
            if (!this.internet_status) {
                this.socket.clients.forEach(client => client.send("CMD:nointernet"));
            } else {
                if (this.qr_status == true) {
                    this.socket.clients.forEach(client => client.send("CMD:qr"));
                } else {
                    if (this.is_connecting) this.socket.clients.forEach(client => client.send("CMD:connecting"));
                    else {
                        if (this.client_status) this.socket.clients.forEach(client => client.send("CMD:connected"));
                        else this.socket.clients.forEach(client => client.send("CMD:disconnected"));
                    }
                }
            }

        }, 10 * 1000);
    }
    /**
     * 
     * @param {WebSocketServer} socket 
     */
    setSocket(socket) {
        this.socket = socket;
    }
    setListener(l) {
        this.listener = l;
    }
    setOnReady(l) {
        this.onReadyListener = l;
    }
    setQRPath(cache_path) {
        if (!fs.existsSync(cache_path)) {
            fs.mkdirSync(cache_path);
        }
        this.path = cache_path;
    }
    setOnSignout(listener) {
        this.onSignoutListener = listener;
    }
    async sendText(number, msg) {
        let id = await this.getId(number);
        if (this.client)
            await this.client.sendMessage(id, msg, {

            });
    }
    /**
     * 
     * @param  {String} phone Phone number
     * @param {String} file the absolute path of file
     * @param {String} caption of the message
     */
    async sendFile(phone, file, file_caption) {
        let res;
        try {

            let loading = this.loadingAnimation("Sending file...", 500);
            const res_phone = String(phone).replace(/\D/g, '');
            let chatId = "";
            let exists = await this.db.has(`p${res_phone}`);
            if (!exists) {
                console.log(chalk.blue("Chat Not Exists"));
                const number_details = await this.client.getNumberId(res_phone); // get mobile number details
                chatId = number_details._serialized;
                await this.db.set(`p${res_phone}`, chatId);

            } else {
                chatId = await this.db.get(`p${res_phone}`);
                console.log(chalk.green("Chat Exists:" + chatId));
            }
            const media = MessageMedia.fromFilePath(file);
            res = await this.client.sendMessage(chatId, media, { caption: file_caption, attachment: media, sendMediaAsDocument: true });
            clearInterval(loading);
            this.socket.clients.forEach(client => client.send("CMD:fileSended"));
            console.log(chalk.blue("FINISH!"));
        } catch {
            this.socket.clients.forEach(client => client.send("CMD:fileNotSended"));
        }
        return res;
    }
    async getId(phone) {
        console.log("PHONE: " + phone);
        return;
        let chatId = await this.client.getNumberId(phone);
        return chatId._serialized;
    }
    loadingAnimation(text, delay) {
        //const chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
        const chars = ["\\", "|", "/", "-"];
        let x = 0;

        return setInterval(function () {
            process.stdout.write("\r" + chars[x++] + " " + text + " ");
            x = x % chars.length;
        }, delay);
    }

    async checkInternet() {
        try {
            if (this.check_loading) clearInterval(this.check_loading);
            this.check_loading = this.loadingAnimation("Internet Checking... ", 200);
            await checknet();
            if (this.check_loading) clearInterval(this.check_loading);
            console.log(chalk.green.bold("-->Internet Connected"));
            return true;
        } catch {
            if (this.check_loading) clearInterval(this.check_loading);
            this.client_status = false;
            console.log(chalk.cyan.bold(" No Internet "));
            this.socket.clients.forEach(client => client.send("CMD:nointernet"));
            return false;
        }
    }

    async initNewClient() {

        if (this.client) {
            console.log("Destroy other session");
            await this.client.destroy();
            this.client = null;
        }
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(__dirname, "../web_auth")
            }),
            restartOnAuthFail: true,
            puppeteer: {
                executablePath: path.join(__dirname, "../", "./win64-982053/chrome-win/chrome.exe"),
                args: ['--no-sandbox'],

                //executablePath: "./src/win64-982053/chrome-win/chrome.exe"
            },
            webVersionCache: {
                type: "local",
                path: path.join(__dirname, "../web_cache")
            },
        });
        this.client.on('authenticated', (session) => {
            this.client_status = true;
            if (this.loadingInit) clearInterval(this.loadingInit);
        });
        this.client.on('ready', () => {
            if (this.loadingInit) clearInterval(this.loadingInit);
            if (this.client_status) this.socket.clients.forEach(client => client.send("CMD:connected"));
            this.client_status = true;
            this.qr_status = false;
            this.is_connecting = false;
            this.onReadyListener();
        });
        this.client.on('qr', qr => {
            this.client_status = false;
            this.qr_status = true;
            // if (this.loadingInit) clearInterval(this.loadingInit);
            qrter.generate(qr, { small: true });
            const file = path.join(__dirname, `../cache/${Date.now()}.png`);
            const rel_file = `./src/cache/${Date.now()}.png`;
            qrcode.toFile(file, qr, {
                type: "png",
                errorCorrectionLevel: "low"
            });
            // console.log("realPath:" + rel_file);
            this.listener(rel_file);
        });
        this.client.on('auth_failure', async (message) => {
            this.qr_status = false;
            this.onSignoutListener();
            this.client_status = false;
            this.is_connecting = true;
            console.log('Auth failure', message);
            this.doConnection();
        });
        this.client.on('disconnected', (message) => {
            this.qr_status = false;
            this.onSignoutListener();
            this.client_status = false;
            this.is_connecting = true;
            console.log('Client was logged out', message);
            this.doConnection();
        });
        this.client_status = false;
        this.loadingInit = this.loadingAnimation(chalk.blue('WhatsApp Web Initialization... '), 200);
        this.is_connecting = true;
        this.socket.clients.forEach(client => client.send("CMD:connecting"));
        await this.client.initialize();
        this.is_connecting = false;
    }
}


module.exports = WhatsApp_API;


