import React from "react";
import ChessBoardComponent from "./components/ChessBoardComponent";
import MessagesComponent from "./components/MessagesComponent";
import ProgressBarComponent from "./components/ProgressBarComponent";
import ConnectionStatus from "./components/ConnectionStatus";
import AvailableMoves from "./components/AvailableMovesComponent";
import { useWebSocket } from "./hooks/useWebSocket";
import { useChessGame } from "./hooks/useChessGame";
import { useState } from "react";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Array<string>>([]);
  const { game, handleMove } = useChessGame(messages, setMessages);
  const { status, timer, progress, progressVisible } = useWebSocket(
    "ws://localhost:8080/ws",
    500,
    15,
    handleMove,
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <ProgressBarComponent
        timer={timer}
        progress={progress}
        progressVisible={progressVisible}
      />
      <ChessBoardComponent game={game} handleMove={handleMove} />
      <ConnectionStatus status={status} />
      <MessagesComponent messages={messages} />
      <AvailableMoves game={game} />
    </div>
  );
};

export default App;
