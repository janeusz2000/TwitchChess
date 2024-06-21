import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

const App: React.FC = () => {
  const [status, setStatus] = useState<boolean>(false);
  const [timer, setTimer] = useState<string>("");
  const [progressVisible, setProgressVisible] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [messages, setMessages] = useState<string[]>([]);
  const [game, setGame] = useState(new Chess());
  const socketRef = useRef<WebSocket | null>(null);

  const reconnectInterval = 500;
  let initialDuration = 15;

  const connect = useCallback(() => {
    if (socketRef.current) {
      return; // If already connected, do not reconnect
    }

    const socket = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus(true);
      console.log("Connected to the WebSocket server");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (message.currentPhase === "voting") {
        setProgressVisible(true);
        setTimer(`Voting Time: ${message.timer} seconds`);
        if (message.timer === initialDuration) {
          initialDuration = message.timer;
        }
        updateProgressBar(message.timer);
      } else if (message.from && message.to) {
        setMessages((prevMessages) => [
          ...prevMessages,
          `Move selected: ${message.from} to ${message.to}`,
        ]);

        try {
          game.move({ from: message.from, to: message.to });
        } catch (error) {
          console.error("Error making move:", error);
        }

        setGame(new Chess(game.fen())); // Update the game state
      } else {
        setTimer("");
        setProgressVisible(false);
        setProgress(100);
      }
    };

    socket.onclose = (event) => {
      setStatus(false);
      console.log(
        "Disconnected from the WebSocket server. Trying to reconnect...",
        event,
      );
      socketRef.current = null;
      setTimeout(connect, reconnectInterval);
    };

    socket.onerror = (error) => {
      setStatus(false);
      console.error("WebSocket error:", error);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [game]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const updateProgressBar = (timer: number) => {
    const percentage = (timer / initialDuration) * 100;
    console.log(`Updating progress bar: ${percentage}%`);
    setProgress(percentage);
  };

  const handleMove = (source: string, target: string) => {
    const move = {
      from: source,
      to: target,
    };

    try {
      const result = game.move(move);
      if (result) {
        sendMove(source, target);
        setGame(new Chess(game.fen()));
        return true;
      } else {
        console.error("Illegal move");
        return false;
      }
    } catch (error) {
      console.error("Error handling move:", error);
      return false;
    }
  };

  const sendMove = async (source: string, target: string) => {
    const moveData = { from: source, to: target };
    try {
      const response = await fetch("http://localhost:8080/ws-client-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveData),
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log(
          `Move ${source}${target} submitted successfully: ${responseText}`,
        );
      } else {
        const responseText = await response.text();
        console.error(
          `Failed to submit move ${source}${target}: ${responseText}`,
        );
      }
    } catch (error) {
      console.error("Error submitting move:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 w-1/2 text-center ">
          <div
            id="progress-container"
            className="w-full h-40 bg-gray-700 rounded-lg overflow-hidden mb-4 relative"
          >
{progressVisible ? ( 
            <div
              id="progress-bar"
              className="h-full bg-gradient-to-r from-red-400 to-blue-500 transition-all duration-500 flex items-center justify-center text-white font-bold"
              style={{ width: `${progress}%` }}
            >
              <div className="font-mono font-bold absolute inset-0 flex items-center justify-center text-6xl">
                {timer}
              </div>
            </div>) : (<div className="font-mono font-bold absolute justify-center items-center flex inset-0 text-8xl">Your turn</div>)}
          </div>
      </div>
      <div id="chessboard-div" className="w-full max-w-4xl relative">
        <Chessboard id="board" position={game.fen()} onPieceDrop={handleMove} />
        <div
          id="status"
          className="bottom-0 right-0 text-xl font-semibold mb-2 flex items-center justify-center bg-gray-800 p-2 rounded"
        >
          {status ? (
            <>
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              Connected
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mr-2">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                Disconnected. Trying to reconnect to the local websocket...
              </div>
            </>
          )}
        </div>
      </div>
      <div
        id="messages"
        className="mt-4 w-full max-w-4xl bg-gray-800 p-4 rounded shadow-lg overflow-y-auto max-h-64"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className="p-2 border-b border-gray-700 last:border-none"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
