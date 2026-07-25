import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"], // force websocket (more reliable)
  reconnectionAttempts: 5,
});

export default socket;