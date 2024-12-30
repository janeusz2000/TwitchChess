"use client"

import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import ReconnectingWebSocket from 'reconnecting-websocket';

export default function ChessGame() {
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const ws = new ReconnectingWebSocket('ws://127.0.0.1:8080/ws');

  ws.addEventListener('open', (event) =>  {
    console.log(event);
  });

  ws.addEventListener('message', (event) => {
    console.log(event);
  });

  ws.addEventListener('close', (event) => {
    console.log(event);
  });

  ws.addEventListener('error', (error) => console.error('WebSocket error:', error));
  ws.addEventListener('ping', () => { ws.send("pong"); } )

  const onPieceDrop = (sourceSquare, targetSquare) => {
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move) {
      setFen(chess.fen());
    }

    // message_type: String,
    // message_subtype: String,
    // value: String,
    const message = {message_type: "COMMAND", message_subtype: "MAKE_MOVE", value: move.san};
    console.log("sending message: ", message);
    ws.send(JSON.stringify(message))
  };

  return (
    <div>
      <Chessboard position={fen} onPieceDrop={onPieceDrop} />
    </div>
  );
}

