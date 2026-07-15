"use client";

import { useGameStore } from "../store/useGameStore";
import Link from "next/link";

export default function Header() {
  const { user } = useGameStore();

  return (
    <header className="w-full flex items-center justify-between px-6 py-3 bg-[#1E293B] text-white shadow-md z-50">
      {/* Left: Logo */}
      <Link href="/" className="text-3xl font-normal tracking-wide hover:opacity-80 transition-opacity">
        PoroGuess
      </Link>

      {/* Center: Navigation Links */}
      <div className="flex-1 flex justify-center gap-8">
        <Link href="/classic" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wider">
          Classic
        </Link>
        <Link href="/jigsaw" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wider">
          Splash Jigsaw
        </Link>
      </div>

      {/* Right: User Profile Frame */}
      {user && (
        <div className="flex flex-col items-center justify-center bg-[#1e232d] px-6 py-1 border border-zinc-700/50 min-w-[150px] shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{user.rank || 'RankFrame'}</span>
            <span className="text-[10px] text-yellow-500 font-bold tracking-wider hidden sm:block">• Score: {user.score}</span>
          </div>
          <span className="text-sm font-medium tracking-wide">{user.username}</span>
          <span className="text-[10px] text-yellow-500 font-bold tracking-wider sm:hidden mt-0.5">Score: {user.score}</span>
        </div>
      )}
    </header>
  );
}
