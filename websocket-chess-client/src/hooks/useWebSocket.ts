import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (url: string, reconnectInterval: number, initialDuration: number, handleMove: (from: string, to: string) => void) => {
  const [status, setStatus] = useState<boolean>(false);
  const [timer, setTimer] = useState<string>("");
  const [progressVisible, setProgressVisible] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [messages, setMessages] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current) {
      return;
    }

    const socket = new WebSocket(url);
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
          handleMove(message.from, message.to);
        } catch (error) {
          console.error("Error making move:", error);
        }
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
  }, [url, reconnectInterval, initialDuration]);

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

  return { status, timer, progress, progressVisible, messages };
};
