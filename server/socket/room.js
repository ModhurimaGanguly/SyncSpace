const rooms = require("./rooms");

function roomHandler(io, socket) {

    socket.on("join-room", (roomId) => {

        console.log("Join event received:", roomId);
        // Join the Socket.IO room
        socket.join(roomId);

        // Create the room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // Add the user to the room
        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }

        // Print current room data
        console.log(rooms);

        // Notify the user that they joined
        socket.emit("room-joined", {
            roomId,
            socketId: socket.id,
            message: "Welcome to SyncSpace!"
        });

        // Notify everyone else in the room
        socket.to(roomId).emit("user-joined", {
            socketId: socket.id,
            roomId,
            message: "A new user joined the room."
        });

        // Send the updated user list to everyone in the room
        console.log("Sending room-users:", rooms[roomId]);

        io.to(roomId).emit("room-users", {
            roomId,
            users: rooms[roomId]
        });
    });

}

module.exports = roomHandler;