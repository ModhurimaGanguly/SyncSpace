const rooms = new Map(); // roomId → { users, code, language, drawing }

function initializeSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ========== JOIN ROOM ==========
    socket.on("join-room", ({ roomId, username }) => {
      if (!roomId || !username) return;

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          code: "",
          language: "cpp",
          drawing: [],
        });
      }

      const room = rooms.get(roomId);
      room.users.set(socket.id, username);

      // Send full current state to the newly joined user
      socket.emit("room-state", {
        code: room.code,
        language: room.language,
        drawing: room.drawing,
        users: Array.from(room.users.values()),
      });

      // Notify everyone else
      socket.to(roomId).emit("user-joined", {
        users: Array.from(room.users.values()),
      });

      console.log(`${username} joined room ${roomId}`);
    });

    // ========== CODE EDITOR ==========
    socket.on("code-change", ({ roomId, code, language }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.code = code;
      if (language) room.language = language;

      // Broadcast to others in the room
      socket.to(roomId).emit("code-update", {
        code,
        language: room.language,
      });
    });


    // ========== WHITEBOARD ==========
    socket.on("draw", ({ roomId, data }) => {
      const room = rooms.get(roomId);

      if (!room) return;

      console.log("🖍 Draw received from:", socket.id);

      room.drawing.push(data);

      io.to(roomId).emit("draw", data);
    });

    socket.on("clear-board", ({ roomId }) => {
      const room = rooms.get(roomId);

      if (!room) return;

      room.drawing = [];

      io.to(roomId).emit("clear-board");
    });

    // ========== CURSOR (optional but nice) ==========
    socket.on("cursor-move", ({ roomId, position, username }) => {
      socket.to(roomId).emit("cursor-update", {
        socketId: socket.id,
        position,
        username,
      });
    });

    // ========== DISCONNECT ==========
    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.users.has(socket.id)) {
          const username = room.users.get(socket.id);
          room.users.delete(socket.id);

          socket.to(roomId).emit("user-left", {
            users: Array.from(room.users.values()),
          });

          console.log(`${username} left room ${roomId}`);

          // Clean empty rooms
          if (room.users.size === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    });
  });
}

module.exports = initializeSocket;