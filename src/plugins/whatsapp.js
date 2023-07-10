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
    client_is_ready = false
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
    isAuth = false;
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
        //this.cache_path = path.join(__dirname, '../', '/cache');
        if (this.client == null)
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath:path.join(__dirname,"../web_auth")
                }),
                restartOnAuthFail: true,
                puppeteer: {
                    executablePath: path.join(__dirname, "../", "./win64-982053/chrome-win/chrome.exe"),
                    args: ['--no-sandbox'],
                
                    //executablePath: "./src/win64-982053/chrome-win/chrome.exe"
                },
                webVersionCache:{
                    type:"local",
                    path:path.join(__dirname,"../web_cache")
                },
            });


        this.client.on('authenticated', (session) => {
            this.isAuth = true
            if (this.loadingInit) clearInterval(this.loadingInit);
        });
        this.client.on('ready', () => {
            if (this.loadingInit) clearInterval(this.loadingInit);
            this.client_is_ready = true;
            this.onReadyListener();
        });
        this.client.on('qr', qr => {
            if (this.loadingInit) clearInterval(this.loadingInit);
            qrter.generate(qr, { small: true });
            this.isAuth = false;
            const file = path.join(__dirname,`../cache/${Date.now()}.png`);
            const rel_file = path.join(__dirname,`../cache/${Date.now()}.png`);
            qrcode.toFile(file, qr, {
                type: "png",
                errorCorrectionLevel: "low"
            });
            // console.log("realPath:" + rel_file);
            this.listener(rel_file);
        });
        this.client.on('disconnected', (reason) => {
            this.onSignoutListener();
            this.isAuth = false;
            console.log('Client was logged out', reason);
            this.client.destroy();
            this.init(this.path);
        });
        setInterval(() => {
            if (this.isAuth) {
                this.socket.clients.forEach(client => client.send("CMD:disconnected"));
            }
            if (this.client_is_ready) {
                this.socket.clients.forEach(client => client.send("CMD:connected"));
            }
        }, 10 * 1000);
        this.clearCache();
        checknet().then(v => {
            this.loadingInit = this.loadingAnimation(chalk.blue('WhatsApp Web Initialization...'), 200);
            this.client.initialize();
        }).catch(() => {
            this.socket.clients.forEach(client => client.send("CMD:nointernet"));
            console.log(chalk.red("No Connection to The Internet We will Try Again Every 10 Seconds"));
            let i = setInterval(async () => {
                if (this.check_loading) clearInterval(this.check_loading);
                this.check_loading = this.loadingAnimation("Internet Checking... ", 200);

                try {
                    await checknet();
                    this.socket.clients.forEach(client => client.send("CMD:nointernet"));
                    console.log(chalk.green.bold(" --> Internet returned "));
                    this.client.initialize();
                    if (this.check_loading) clearInterval(this.check_loading);
                    clearInterval(i);
                } catch {
                    console.log(chalk.cyan.bold(" No Internet "));
                }
            }, 10000);
        });
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
            fs.mkdir(cache_path);
        }
        this.path = cache_path;
    }
    setOnSignout(listener) {
        this.onSignoutListener = listener;
    }
    async sendText(number, msg) {
        let id = await this.getId(number);
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
        let res = await this.client.sendMessage(chatId, media, { caption: file_caption, attachment: media, sendMediaAsDocument: true });
        clearInterval(loading);
        console.log(chalk.blue("FINISH!"));
        return res;
    }
    async getId(phone) {
        console.log("PHONE: " + phone);
        return;
        let chatId = await this.client.getNumberId(phone);
        return chatId._serialized;
    }
    loadingAnimation(text, delay) {
        const chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
        //const chars =["\\", "|", "/", "-"];
        let x = 0;
        return setInterval(function () {
            process.stdout.write("\r" + chars[x++] + " " + text);
            x = x % chars.length;
        }, delay);
    }
}

module.exports = WhatsApp_API;


