require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const localDB = require("./DB/localDB");
const db = require("./DB");
db.connect()
const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");

app.use(express.json());
app.use(cors());

app.use("/api", require("./router"));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  let userData = socket.handshake?.auth?.userData,
  id = userData?._id
  if (!id) return;
  console.log("new connection :", userData);
  
  localDB.sockets[id] = socket
  // TODO : לבחון שימוש בחדר
  socket.join(id)
  
  // if (localDB.sockets[id]) return;

  socket.on("disconnect", (reason) => {
    id = socket.handshake?.auth?.userData?._id
    console.log("disconnect :", id || socket.id, ", reason:", reason);
    if (id) delete localDB.sockets[id]
  })
});

// TODO: פונקציה לשחזר את תור העבודה במקרה שהשרת קרס
// לקרוא לפונקציה לפני או אחרי ההאזנה
// createNewQueue(id = '65ed9c525b51ed6b4bd16107');

server.listen(3000, () => {
  console.log("listening on *:3000");
});

module.exports = io;