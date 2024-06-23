import React from 'react';

interface MessagesComponentProps {
  messages: string[];
}

const MessagesComponent: React.FC<MessagesComponentProps> = ({ messages }) => {
  return (
    <div
      id="messages"
      className="mt-4 w-full max-w-4xl bg-gray-800 p-4 rounded shadow-lg overflow-y-auto max-h-64"
    >
      {messages.map((msg, index) => (
        <div key={index} className="p-2 border-b border-gray-700 last:border-none">
          {msg}
        </div>
      ))}
    </div>
  );
};

export default MessagesComponent;
