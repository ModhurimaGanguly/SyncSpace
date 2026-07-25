require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const initializeSocket = require("./socket");

// Fixed require (no more import)
const executeRoute = require("./routes/execute");
app.use("/execute", executeRoute);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // later change to "http://localhost:5173"
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});