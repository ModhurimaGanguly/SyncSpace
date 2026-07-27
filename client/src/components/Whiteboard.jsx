import { Stage, Layer, Line, Rect, Circle, Text as KonvaText } from "react-konva";
import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import {
  MousePointer,
  Pencil,
  Eraser,
  Type,
  Minus,
  Square,
  Circle as CircleIcon,
  Trash2,
  Undo2,
  Redo2,
  Sun,
  Moon,
} from "lucide-react";

function Whiteboard({ roomId, joined, theme = "dark", toggleTheme }) {
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);

  const [activeTool, setActiveTool] = useState("pencil");
  const [color, setColor] = useState(theme === "dark" ? "#60a5fa" : "#2563eb");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const isDrawing = useRef(false);
  const currentElementRef = useRef(null);
  const containerRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });

  const isDark = theme === "dark";
  const canvasBg = isDark ? "#121212" : "#f8fafc";
  const eraserBg = canvasBg;

  // Sync color selection when switching theme defaults
  useEffect(() => {
    if (color === "#60a5fa" && !isDark) setColor("#2563eb");
    if (color === "#2563eb" && isDark) setColor("#60a5fa");
  }, [isDark]);

  // Responsive stage sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({
          width: width || 800,
          height: height || 500,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on("draw", (data) => setElements((prev) => [...prev, data]));
    socket.on("update-elements", (updated) => setElements(updated));
    socket.on("clear-board", () => {
      setElements([]);
      setHistory([]);
    });

    return () => {
      socket.off("draw");
      socket.off("update-elements");
      socket.off("clear-board");
    };
  }, []);

  // Drawing Handlers
  const handleMouseDown = (e) => {
    if (activeTool === "select") return;

    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty && activeTool !== "pencil" && activeTool !== "eraser") return;

    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();

    if (activeTool === "text") {
      const text = prompt("Enter text:", "Hello");
      if (text) {
        const textElement = {
          id: Date.now().toString(),
          type: "text",
          text,
          x: pos.x,
          y: pos.y,
          color,
          fontSize: strokeWidth * 4 + 14,
        };
        setElements((prev) => [...prev, textElement]);
        if (joined) socket.emit("draw", { roomId, data: textElement });
      }
      isDrawing.current = false;
      return;
    }

    const newElement = {
      id: Date.now().toString(),
      type: activeTool,
      color: activeTool === "eraser" ? eraserBg : color,
      strokeWidth: activeTool === "eraser" ? strokeWidth * 5 : strokeWidth,
      points: [pos.x, pos.y],
      startX: pos.x,
      startY: pos.y,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    currentElementRef.current = newElement;
    setElements((prev) => [...prev, newElement]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || activeTool === "select") return;
    const pos = e.target.getStage().getPointerPosition();

    setElements((prevElements) => {
      const lastElem = prevElements[prevElements.length - 1];
      if (!lastElem) return prevElements;

      let updatedElem = { ...lastElem };

      if (activeTool === "pencil" || activeTool === "eraser") {
        updatedElem.points = [...lastElem.points, pos.x, pos.y];
      } else if (activeTool === "rect") {
        updatedElem.width = pos.x - lastElem.startX;
        updatedElem.height = pos.y - lastElem.startY;
      } else if (activeTool === "circle") {
        const dx = pos.x - lastElem.startX;
        const dy = pos.y - lastElem.startY;
        updatedElem.radius = Math.sqrt(dx * dx + dy * dy);
      } else if (activeTool === "line") {
        updatedElem.points = [lastElem.startX, lastElem.startY, pos.x, pos.y];
      }

      currentElementRef.current = updatedElem;
      return [...prevElements.slice(0, prevElements.length - 1), updatedElem];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (!joined || !currentElementRef.current) return;

    socket.emit("draw", { roomId, data: currentElementRef.current });
    currentElementRef.current = null;
  };

  const handleDragEnd = (index, e) => {
    const { x, y } = e.target.position();
    setElements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], x, y };
      if (joined) socket.emit("update-elements", { roomId, elements: updated });
      return updated;
    });
  };

  const handleClear = () => {
    setElements([]);
    setHistory([]);
    if (joined) socket.emit("clear-board", { roomId });
  };

  const handleUndo = () => {
    if (elements.length === 0) return;
    const last = elements[elements.length - 1];
    setHistory((prev) => [...prev, last]);
    const updated = elements.slice(0, elements.length - 1);
    setElements(updated);
    if (joined) socket.emit("update-elements", { roomId, elements: updated });
  };

  const handleRedo = () => {
    if (history.length === 0) return;
    const next = history[history.length - 1];
    const updated = [...elements, next];
    setElements(updated);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    if (joined) socket.emit("update-elements", { roomId, elements: updated });
  };

  const paletteColors = isDark
    ? ["#ffffff", "#60a5fa", "#ef4444", "#10b981", "#f59e0b", "#a855f7"]
    : ["#0f172a", "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: canvasBg,
        overflow: "hidden",
      }}
    >
      {/* Floating Excalidraw-Style Modern Toolbar */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 10px",
          background: isDark ? "rgba(30, 30, 30, 0.85)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        }}
      >
        {/* Undo / Redo */}
        <button style={btnStyle(false, isDark)} onClick={handleUndo} title="Undo">
          <Undo2 size={16} />
        </button>
        <button style={btnStyle(false, isDark)} onClick={handleRedo} title="Redo">
          <Redo2 size={16} />
        </button>

        <div style={dividerStyle(isDark)} />

        {/* Tools */}
        <button style={btnStyle(activeTool === "select", isDark)} onClick={() => setActiveTool("select")} title="Select & Move">
          <MousePointer size={16} />
        </button>
        <button style={btnStyle(activeTool === "pencil", isDark)} onClick={() => setActiveTool("pencil")} title="Pencil">
          <Pencil size={16} />
        </button>
        <button style={btnStyle(activeTool === "eraser", isDark)} onClick={() => setActiveTool("eraser")} title="Eraser">
          <Eraser size={16} />
        </button>
        <button style={btnStyle(activeTool === "text", isDark)} onClick={() => setActiveTool("text")} title="Text">
          <Type size={16} />
        </button>

        <div style={dividerStyle(isDark)} />

        {/* Shapes */}
        <button style={btnStyle(activeTool === "line", isDark)} onClick={() => setActiveTool("line")} title="Line">
          <Minus size={16} />
        </button>
        <button style={btnStyle(activeTool === "rect", isDark)} onClick={() => setActiveTool("rect")} title="Rectangle">
          <Square size={16} />
        </button>
        <button style={btnStyle(activeTool === "circle", isDark)} onClick={() => setActiveTool("circle")} title="Circle">
          <CircleIcon size={16} />
        </button>

        <div style={dividerStyle(isDark)} />

        {/* Color Swatches */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {paletteColors.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: c,
                cursor: "pointer",
                border: color === c ? (isDark ? "2px solid #fff" : "2px solid #000") : "none",
                transform: color === c ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            />
          ))}
        </div>

        <div style={dividerStyle(isDark)} />

        {/* Size Slider */}
        <input
          type="range"
          min="1"
          max="15"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          style={{ width: "60px", cursor: "pointer", accentColor: "#3b82f6" }}
          title="Stroke Width"
        />

        <div style={dividerStyle(isDark)} />

        {/* Theme Toggle Button */}
        {toggleTheme && (
          <button style={btnStyle(false, isDark)} onClick={toggleTheme} title="Toggle Theme">
            {isDark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
          </button>
        )}

        {/* Clear Canvas */}
        <button
          onClick={handleClear}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "5px 8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          title="Clear Canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Konva Canvas */}
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: activeTool === "select" ? "default" : "crosshair" }}
      >
        <Layer>
          {elements.map((el, i) => {
            const isDraggable = activeTool === "select";

            if (el.type === "pencil" || el.type === "eraser" || el.type === "line") {
              return (
                <Line
                  key={el.id || i}
                  x={el.x || 0}
                  y={el.y || 0}
                  points={el.points}
                  stroke={el.type === "eraser" ? eraserBg : el.color}
                  strokeWidth={el.strokeWidth}
                  tension={el.type === "line" ? 0 : 0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={isDraggable}
                  onDragEnd={(e) => handleDragEnd(i, e)}
                />
              );
            }
            if (el.type === "rect") {
              return (
                <Rect
                  key={el.id || i}
                  x={el.startX + (el.x || 0)}
                  y={el.startY + (el.y || 0)}
                  width={el.width}
                  height={el.height}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth}
                  draggable={isDraggable}
                  onDragEnd={(e) => handleDragEnd(i, e)}
                />
              );
            }
            if (el.type === "circle") {
              return (
                <Circle
                  key={el.id || i}
                  x={el.startX + (el.x || 0)}
                  y={el.startY + (el.y || 0)}
                  radius={el.radius || 0}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth}
                  draggable={isDraggable}
                  onDragEnd={(e) => handleDragEnd(i, e)}
                />
              );
            }
            if (el.type === "text") {
              return (
                <KonvaText
                  key={el.id || i}
                  x={el.x || 0}
                  y={el.y || 0}
                  text={el.text}
                  fill={el.color}
                  fontSize={el.fontSize}
                  draggable={isDraggable}
                  onDragEnd={(e) => handleDragEnd(i, e)}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}

// Inline Glassmorphic Style Helpers
const btnStyle = (active, isDark) => ({
  background: active ? "#3b82f6" : "transparent",
  color: active ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
  border: "none",
  borderRadius: "8px",
  padding: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const dividerStyle = (isDark) => ({
  width: "1px",
  height: "18px",
  background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
});

export default Whiteboard;