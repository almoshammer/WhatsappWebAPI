var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// wss.mjs
var wss_exports = {};
__export(wss_exports, {
  default: () => wss_default
});
module.exports = __toCommonJS(wss_exports);
var import_crypto = __toESM(require("crypto"), 1);
var import_http = __toESM(require("http"), 1);
var wss_default = (opt) => {
  opt = opt || {};
  opt.port = opt.port || 9500;
  opt.host = opt.host || "localhost";
  opt.onReady = opt.onReady || function(api) {
    api.sendText("Hello World");
  };
  let genAcceptKey = (req) => {
    let key = req.headers["sec-websocket-key"], sha1 = import_crypto.default.createHash("sha1");
    sha1.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    let acceptKey = sha1.digest("base64");
    return acceptKey;
  };
  let acceptUpgrade = (req, socket) => {
    let acceptKey = genAcceptKey(req);
    socket.write("HTTP/1.1 101 Web Socket Protocol Handshake\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acceptKey + "\r\n\r\n");
  };
  let sendTextFrame = function(socket, text) {
    let firstByte = 0, secondByte = 0, payloadLength = Buffer.from([0, 0]), payload = Buffer.alloc(text.length);
    payload.write(text);
    firstByte |= 128;
    firstByte |= 1;
    secondByte |= text.length;
    let frame = Buffer.concat([Buffer.from([firstByte]), Buffer.from([secondByte]), payload]);
    socket.write(frame);
  };
  let wsServer = import_http.default.createServer();
  wsServer.on("upgrade", (req, socket, head) => {
    acceptUpgrade(req, socket);
    opt.onReady({
      socket,
      sendText: function(text) {
        sendTextFrame(this.socket, text);
      }
    }, socket);
  });
  wsServer.listen(opt.port, opt.host, () => {
    console.log("web socket server is up on port: " + opt.port);
  });
  return wsServer;
};
