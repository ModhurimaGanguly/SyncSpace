const roomHandler = require("./room");

function initializeSocket(io) {

    io.on("connection", (socket) => {

        console.log(`User Connected : ${socket.id}`);

        roomHandler(io, socket);

    });

}

module.exports = initializeSocket;