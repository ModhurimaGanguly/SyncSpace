import { Stage, Layer, Line } from "react-konva";
import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";

function Whiteboard({ roomId, joined }) {
    const [lines, setLines] = useState([]);
    const isDrawing = useRef(false);

    const containerRef = useRef(null);

    const [stageSize, setStageSize] = useState({
        width: 1000,
        height: 500,
    });

    // Responsive canvas
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setStageSize({
                    width: containerRef.current.offsetWidth,
                    height: 500,
                });
            }
        };

        updateSize();

        window.addEventListener("resize", updateSize);

        return () => window.removeEventListener("resize", updateSize);
    }, []);

    // Listen for drawings from other users
    useEffect(() => {
        socket.on("draw", (data) => {
            console.log("Received draw:", data);

            setLines((prevLines) => [...prevLines, data]);
        });

        socket.on("clear-board", () => {
            setLines([]);
        });

        return () => {
            socket.off("draw");
            socket.off("clear-board");
        };
    }, []);

    // Start drawing
    const handleMouseDown = (e) => {
        isDrawing.current = true;

        const pos = e.target.getStage().getPointerPosition();

        setLines((prevLines) => [
            ...prevLines,
            {
                points: [pos.x, pos.y],
            },
        ]);
    };

    // Continue drawing
    const handleMouseMove = (e) => {
        if (!isDrawing.current) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        setLines((prevLines) => {
            const lastLine = prevLines[prevLines.length - 1];

            if (!lastLine) return prevLines;

            const updatedLine = {
                ...lastLine,
                points: [...lastLine.points, point.x, point.y],
            };

            return [
                ...prevLines.slice(0, prevLines.length - 1),
                updatedLine,
            ];
        });
    };

    // Finish drawing
    const handleMouseUp = () => {
        isDrawing.current = false;

        if (!joined) return;

        const lastLine = lines[lines.length - 1];

        if (!lastLine) return;

        socket.emit("draw", {
            roomId,
            data: lastLine,
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                marginTop: "30px",
                border: "2px solid #444",
                borderRadius: "10px",
                overflow: "hidden",
            }}
        >
            <Stage
                width={stageSize.width}
                height={stageSize.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                    background: "#1f1f1f",
                    cursor: "crosshair",
                }}
            >
                <Layer>
                    {lines.map((line, index) => (
                        <Line
                            key={index}
                            points={line.points}
                            stroke="white"
                            strokeWidth={3}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
}

export default Whiteboard;