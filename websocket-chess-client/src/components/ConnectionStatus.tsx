import React from "react";

export const ConnectionStatus: React.FC<{ status: boolean }> = ({ status }) => {
  return (
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
          <div>Disconnected. Trying to reconnect to the local websocket...</div>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;
