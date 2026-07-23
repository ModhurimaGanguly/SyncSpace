const roomHandler = require("./room");

function initializeSocket(io) {

    io.on("connection", (socket) => {

        console.log(`User Connected : ${socket.id}`);

        roomHandler(io, socket);

        socket.on("disconnect", () => {

            console.log(`User Disconnected : ${socket.id}`);

        });

    });

}

module.exports = initializeSocket;