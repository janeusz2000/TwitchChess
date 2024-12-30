"use client"
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Welcome to Twith-Chess</h1>
      <p>
          This is chess game that iteracts with twitch chat.
      </p>
      <Link href="/chessGame">
          Start a game
      </Link>
    </div>
  );
};
