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
        <Link href="/traits" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wider">
          Traits
        </Link>
        <Link href="/jigsaw" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wider">
          Splash Jigsaw
        </Link>
        <Link href="/matcher" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wider">
          Icon Matcher
        </Link>
        <Link href="/leaderboard" className="text-sm font-medium text-yellow-500 hover:text-yellow-400 transition-colors uppercase tracking-wider flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
          Leaderboard
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
