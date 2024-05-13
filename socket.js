const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { clients, sockets } = require("./DB/localDB");
// Import the io object from index.js
const io = require("./index");

let client;
let id;

async function getSession(clientId) {
  let isSession = Boolean(clientId && clients[clientId])
  if (isSession) {
    client = new Client({
      puppeteer: { headless: true, args: ["--no-sandbox"], },
      authStrategy: new LocalAuth({ clientId })
    });

    client.on('auth_failure', (m) => {
      console.log(m);
    })
    client.on('authenticated', (m) => {
      console.log(m);
    })
    client.on("ready", () => {
      console.log(`Client ${clientId} is ready!`);
      client.isReady = true
      clients[clientId] = client;
      sockets[clientId].emit(`ready`);
    });
    client.on('disconnected', (reason) => {
      console.error('Client disconnected:', reason);
    });
    client.on('message', (msg) => {
      console.log('Received message:', msg.body);
    });
    if (client.isReady) {
      client.bot.on("disconnected", (reason) => {
        console.log(`Session disconnected for reason ${reason}`);
      });
    }
    
    client
    .initialize()
    .then(async t => {
      console.log(" ###### then ######",t);
    })
    .catch((e) => {
      console.log("######### catch initialize ##########\n",e);
    });
  }

  return isSession;
}

async function generateQR(clientId) {
  if (!clientId) throw "Client ID - ERROR";
  client = new Client({
    puppeteer: { headless: true, args: ["--no-sandbox"], },
    authStrategy: new LocalAuth({ clientId })
  });

  client.on("qr", async (qr) => {
    console.log(`Request for QR code received for ${clientId}`);
    qrcode.generate(qr, { small: "true" });
    sockets[clientId].emit("qr", qr)
  });

  client
    .initialize()
    .then(async t => {
      console.log(t);
    })
    .catch((e) => {
      console.log(e);
    });

  clients[clientId] = client
  // sockets[clientId] = socket
}

module.exports = { generateQR,getSession };
