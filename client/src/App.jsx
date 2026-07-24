import { useState, useEffect } from "react";
import socket from "./socket/socket";
import Editor from "@monaco-editor/react";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("JavaScript");

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

  //first useeffect
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
    });

    socket.on("receive-language", (newLanguage) => {
      setLanguage(newLanguage);
    });

    return () => {
      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("room-users");
      socket.off("received-code");
      socket.off("receive-language");
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
      <label htmlFor="language">Language: </label>

      <select
        id="language"
        value={language}
        onChange={(e) => {
          const newLanguage = e.target.value;

          setLanguage(newLanguage);

          socket.emit("language-change", {
            roomId,
            language: newLanguage,
          });
        }}
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
        <option value="c">C</option>
        <option value="typescript">TypeScript</option>
      </select>
      <Editor
        height="500px"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(value) => {
          const newCode = value || "";

          setCode(newCode);

          socket.emit("code-change", {
            roomId,
            code: newCode,
          });
        }}
      />
    </div>
  );
}

export default App;