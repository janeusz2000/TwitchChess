import React from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardComponentProps {
  game: Chess;
  handleMove: (source: string, target: string) => boolean;
}

const ChessBoardComponent: React.FC<ChessBoardComponentProps> = ({ game, handleMove }) => {
  return (
    <div id="chessboard-div" className="w-full max-w-4xl relative">
      <Chessboard id="board" position={game.fen()} onPieceDrop={handleMove} />
    </div>
  );
};

export default ChessBoardComponent;
