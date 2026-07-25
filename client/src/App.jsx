import { useState, useEffect } from "react";
import socket from "./socket/socket";
import Editor from "@monaco-editor/react";
import axios from "axios";

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("// Start coding together...");
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Please write some code.");
      return;
    }

    try {
      setLoading(true);
      setOutput("Running...");

      const response = await axios.post(
        "http://localhost:5000/execute",
        {
          code,
          language,
        }
      );

      if (response.data.success) {
        setOutput(response.data.output);
      } else {
        setOutput(response.data.output || "Execution failed");
      }
    } catch (err) {
      console.error(err);

      setOutput(
        err.response?.data?.error ||
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };
  // ========== JOIN ROOM ==========
  const joinRoom = () => {
    console.log("Join button clicked");
    console.log("Current socket connected?", socket.connected);

    if (!roomId.trim() || !username.trim()) {
      alert("Please enter both Username and Room ID");
      return;
    }

    // Force connect
    if (!socket.connected) {
      console.log("Connecting socket...");
      socket.connect();
    }

    console.log("Emitting join-room →", { roomId, username });
    socket.emit("join-room", { roomId, username });
  };

  // ========== SOCKET EVENTS ==========
  useEffect(() => {
    console.log("Setting up socket listeners...");

    socket.on("connect", () => {
      console.log("✅ Socket connected with id:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    // This is the most important event
    socket.on("room-state", (state) => {
      console.log("🎉 Successfully joined! Room state:", state);
      setJoined(true);
      setCode(state.code || "// Start coding together...");
      setLanguage(state.language || "cpp");
      setUsers(state.users || []);
    });

    socket.on("user-joined", ({ users }) => {
      console.log("User joined →", users);
      setUsers(users);
    });

    socket.on("user-left", ({ users }) => {
      console.log("User left →", users);
      setUsers(users);
    });

    socket.on("code-update", ({ code, language }) => {
      console.log("Code updated from another user");
      setCode(code);
      if (language) setLanguage(language);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("room-state");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("code-update");
    };
  }, []);

  // Disconnect when component unmounts
  useEffect(() => {
    return () => {
      if (socket.connected) {
        console.log("Disconnecting socket...");
        socket.disconnect();
      }
    };
  }, []);

  return (
    <div style={{
      padding: "40px",
      background: "#1a1a1a",
      color: "white",
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
        <span style={{ fontSize: "32px" }}>🚀</span>
        <h1 style={{ margin: 0, fontSize: "28px" }}>SyncSpace</h1>
      </div>

      {/* Join Form */}
      {!joined ? (
        <div style={{ display: "flex", gap: "12px", marginBottom: "30px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={inputStyle}
          />
          <button onClick={joinRoom} style={buttonStyle}>
            Join Room
          </button>
        </div>
      ) : (
        <p style={{ color: "#4ade80", marginBottom: "20px" }}>
          ✅ Joined as <strong>{username}</strong> in room <strong>{roomId}</strong>
        </p>
      )}

      <hr style={{ borderColor: "#333", margin: "20px 0" }} />

      {/* Active Users */}
      <h2 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
        👥 Active Users ({users.length})
      </h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {users.map((user, i) => (
          <li key={i} style={{ padding: "4px 0" }}>{user}</li>
        ))}
      </ul>

      {/* Language */}
      <div style={{ margin: "20px 0" }}>
        <label>Language: </label>
        <select
          value={language}
          onChange={(e) => {
            const newLang = e.target.value;
            setLanguage(newLang);
            if (joined) {
              socket.emit("code-change", { roomId, code, language: newLang });
            }
          }}
          style={{
            ...inputStyle,
            width: "140px",
            cursor: "pointer"
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="java">Java</option>
        </select>
      </div>

      {/* Editor */}
      <Editor
        height="500px"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(value) => {
          const newCode = value || "";
          setCode(newCode);
          if (joined) {
            socket.emit("code-change", {
              roomId,
              code: newCode,
              language,
            });
          }
        }}
        options={{
          fontSize: 15,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />

      {/* Run Button */}
      <button
        onClick={runCode}
        disabled={loading}
        style={{
          ...buttonStyle,
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        {loading ? "Running..." : "▶ Run Code"}
      </button>

      {/* Output */}
      <h3>Output</h3>
      <pre
        style={{
          background: "#111",
          color: "#00ff88",
          padding: "15px",
          borderRadius: "8px",
          minHeight: "120px",
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {output}
      </pre>

    </div>
  );
}


// Styles
const inputStyle = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #444",
  background: "#2a2a2a",
  color: "white",
  fontSize: "14px",
  outline: "none",
};

const buttonStyle = {
  padding: "10px 22px",
  borderRadius: "8px",
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "14px",
};

export default App;