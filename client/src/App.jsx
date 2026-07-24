import { useState, useEffect } from "react";
import socket from "./socket/socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("");

  const joinRoom = () => {
    console.log("Join button clicked");

    if (roomId.trim() === "") {
      alert("Please enter a Room ID");
      return;
    }

    if (socket.connected) {
      console.log("Emitting join-room:", roomId);
      socket.emit("join-room", roomId);
    } else {
      console.log("Socket not connected");
    }
  };

  useEffect(() => {
    socket.on("room-joined", (data) => {
      console.log("Server Response:", data);
      setJoined(true);
    });

    socket.on("user-joined", (data) => {
      console.log("Another user joined:", data);
    });

    socket.on("room-users", (data) => {
      console.log("Users in room:", data.users);
      setUsers(data.users);
    });

    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    })
    return () => {
      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("room-users");
      socket.off("received-code");
    };
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h1>🚀 SyncSpace</h1>

      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <button onClick={joinRoom} disabled={joined}>
        {joined ? "Joined" : "Join Room"}
      </button>
      <hr />


      <h2>👥 Active Users ({users.length})</h2>
      <ul>
        {users.map((user) => (
          <li key={user}>{user}</li>
        ))}
      </ul>
      <h2>Code Editor</h2>

      <textarea
        value={code}
        onChange={(e) => {
          const newCode = e.target.value;

          setCode(newCode);

          socket.emit("code-change", {
            roomId,
            code: newCode,
          });
        }}
        rows={15}
        cols={80}
        placeholder="Start typing..."
      />
    </div>
  );
}

export default App;