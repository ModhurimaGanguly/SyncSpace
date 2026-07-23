const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const initializeSocket = require("./socket");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

initializeSocket(io);

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});