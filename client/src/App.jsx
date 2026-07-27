import { useState, useEffect } from "react";
import socket from "./socket/socket";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Whiteboard from "./components/Whiteboard";
import { Group, Panel, Separator } from "react-resizable-panels";
import "./App.css";

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("// Start coding together...");
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  const [theme, setTheme] = useState("dark"); // "dark" | "light"

  // ========== RUN CODE ==========
  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Please write some code.");
      return;
    }

    try {
      setLoading(true);
      setOutput("Running...");
      setIsOutputOpen(true); // Open terminal automatically when running

      const response = await axios.post("http://localhost:5000/execute", {
        code,
        language,
      });

      if (response.data.success) {
        setOutput(response.data.output);
      } else {
        setOutput(response.data.output || "Execution failed");
      }
    } catch (err) {
      console.error(err);
      setOutput(
        err.response?.data?.error || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========== DARK / LIGHT THEME TOGGLE ==========
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // ========== JOIN ROOM ==========
  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) {
      alert("Please enter both Username and Room ID");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-room", { roomId, username });
  };

  // ========== SOCKET EVENTS ==========
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Socket connected with id:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    socket.on("room-state", (state) => {
      setJoined(true);
      setCode(state.code || "// Start coding together...");
      setLanguage(state.language || "cpp");
      setUsers(state.users || []);
    });

    socket.on("user-joined", ({ users }) => {
      setUsers(users);
    });

    socket.on("user-left", ({ users }) => {
      setUsers(users);
    });

    socket.on("code-update", ({ code, language }) => {
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

  useEffect(() => {
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <div className={`app-container ${theme}`}>
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="brand">
          <span className="logo-icon">🚀</span>
          <h2>SyncSpace</h2>
        </div>

        {/* Join Room Form or User Info */}
        <div className="room-controls">
          {!joined ? (
            <div className="join-inputs">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="input-field"
              />
              <button onClick={joinRoom} className="join-btn">
                Join Room
              </button>
            </div>
          ) : (
            <div className="joined-tag">
              <span className="status-dot">●</span>
              <span>
                <strong>{username}</strong> @ <strong>{roomId}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="action-bar">
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              if (joined) {
                socket.emit("code-change", { roomId, code, language: newLang });
              }
            }}
            className="lang-select"
          >
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
          </select>

          <button onClick={toggleTheme} className="theme-toggle-btn">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button onClick={runCode} disabled={loading} className="run-btn">
            {loading ? "Running..." : "▶ Run Code"}
          </button>
        </div>
      </header>

      {/* Main Split Panel Area */}
      <main className="main-workspace">
        <Group orientation="horizontal">
          {/* Left Panel: Monaco Code Editor */}
          <Panel defaultSize="50%" minSize="30%">
            <div className="panel-container">
              <div className="panel-header">
                <span>Code Editor</span>
                {joined && (
                  <div className="active-users">
                    👥 Users ({users.length}): {users.join(", ")}
                  </div>
                )}
              </div>
              <div className="editor-wrapper">
                <Editor
                  height="100%"
                  language={language}
                  theme={theme === "dark" ? "vs-dark" : "light"}
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
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12 },
                  }}
                />
              </div>
            </div>
          </Panel>

          {/* Resizable Separator Handle */}
          <Separator className="resize-handle" />

          {/* Right Panel: Fabric Whiteboard */}
          <Panel defaultSize="50%" minSize="30%">
            <div className="panel-container">
              <div className="panel-header">
                <span>📝 Whiteboard</span>
              </div>
              <div className="whiteboard-wrapper">
                <Whiteboard roomId={roomId} joined={joined} theme={theme} />
              </div>
            </div>
          </Panel>
        </Group>
      </main>

      {/* Bottom Collapsible Terminal Output */}
      <footer className={`output-drawer ${isOutputOpen ? "open" : "closed"}`}>
        <div
          className="drawer-header"
          onClick={() => setIsOutputOpen(!isOutputOpen)}
        >
          <span className="title">Terminal Output</span>
          <button className="toggle-btn">{isOutputOpen ? "▼" : "▲"}</button>
        </div>
        {isOutputOpen && (
          <div className="terminal-content">
            <pre>{output || "Output will appear here after execution..."}</pre>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;