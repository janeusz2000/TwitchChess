import React from 'react';
import ChessBoardComponent from './components/ChessBoardComponent';
import MessagesComponent from './components/MessagesComponent';
import ProgressBarComponent from './components/ProgressBarComponent';
import { useWebSocket } from './hooks/useWebSocket';
import { useChessGame } from './hooks/useChessGame';

const App: React.FC = () => {
 const { game, handleMove} = useChessGame();
  const { status, timer, progress, progressVisible, messages} = useWebSocket(
    "ws://localhost:8080/ws",
    500,
    15,
    handleMove,
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <ProgressBarComponent timer={timer} progress={progress} progressVisible={progressVisible} />
      <ChessBoardComponent game={game} handleMove={handleMove} />
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
      <MessagesComponent messages={messages} />
    </div>
  );
};

export default App;
