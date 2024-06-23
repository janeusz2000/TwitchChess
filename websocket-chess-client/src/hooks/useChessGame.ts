import { useState } from "react";
import { Chess } from "chess.js";

export const useChessGame = (
  messages: Array<string>,
  setMessages: (messages: Array<string>) => void,
) => {
  const [game, setGame] = useState(new Chess());

  const handleMove = (source: string, target: string) => {
    const move = {
      from: source,
      to: target,
    };

    try {
      game.move(move);
      setGame(new Chess(game.fen()));
    } catch (error) {
      console.error("Invalid move: ", error);
      return false;
    }

    setMessages([...messages, game.history()[0]]);
    return true;
  };

  return { game, handleMove };
};
