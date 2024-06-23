import { useState } from 'react';
import { Chess } from 'chess.js';

export const useChessGame = () => {
  const [game, setGame] = useState(new Chess());

  const handleMove = (source: string, target: string) => {
    const move = {
      from: source,
      to: target,
    };

    try {
      const result = game.move(move);
      if (result) {
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

  return { game, handleMove };
};
