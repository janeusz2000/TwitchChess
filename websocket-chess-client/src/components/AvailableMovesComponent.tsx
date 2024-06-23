import React from "react";
import { Chess } from "chess.js";

export const AvailableMoves: React.FC<{ game: Chess }> = ({ game }) => {
  return (
    <>
      <div className="bg-black w-full max-w-4xl">{game.moves()}</div>
    </>
  );
};

export default AvailableMoves;
