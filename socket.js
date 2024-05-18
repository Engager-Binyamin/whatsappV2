const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { clients, sockets } = require("./DB/localDB");
// Import the io object from index.js
const io = require("./index");

let client;
let id;

async function getSession(clientId) {
  // let isSession = Boolean(clientId && clients[clientId])
  if (!clients[clientId]) sockets[clientId]?.emit("session", { code: 14, msg: "generate QR" })

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: clientId,
      puppeteer: { unsafeMime: true }
    }),
    // puppeteer: {  unsafeMime: true  },
    webVersion: '2.2411.2',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2411.2.html',
    }
  });

  client.on("qr", async (qr) => {
    console.log(`Request for QR code received for ${clientId}`);
    qrcode.generate(qr, { small: "true" });
    sockets[clientId]?.emit("qr", qr)
  });

  client.on('auth_failure', _ => {
    // TODO: למחוק תיקייה מקומית
    sockets[clientId]?.emit("session", { code: 15, msg: "auth failure" })
  })
  client.on('authenticated', _ => {
    sockets[clientId]?.emit("session", { code: 10, msg: "authenticated" })
  })

  client.on("ready", () => {
    console.log(`Client ${clientId} is ready!`);
    client.isReady = true
    clients[clientId] = client;
    sockets[clientId]?.emit("session", { code: 11, msg: "ready" })
  });

  client.on('disconnected', (reason) => {
    delete clients[clientId]
    sockets[clientId]?.emit("session", { code: 16, msg: "disconnected" })

    // TODO: לבדוק האם מדובר על התנתקות זמנית או לגמרי מחיקת סיישן עתידי
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
    .catch((e) => {
      console.log("######### catch initialize ##########\n", e);
    });
}

module.exports = { getSession };
