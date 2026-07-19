"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import Link from "next/link";
import ProfileModal from "./ProfileModal";

const RANK_THRESHOLDS = [
  { rank: "CHALLENGER",  minScore: 2800, color: "#00e5ff" },
  { rank: "GRANDMASTER", minScore: 1800, color: "#ff4444" },
  { rank: "MASTER",      minScore: 1200, color: "#a855f7" },
  { rank: "DIAMOND",     minScore: 750,  color: "#60a5fa" },
  { rank: "EMERALD",     minScore: 450,  color: "#10b981" },
  { rank: "PLATINUM",    minScore: 250,  color: "#2dd4bf" },
  { rank: "GOLD",        minScore: 120,  color: "#f59e0b" },
  { rank: "SILVER",      minScore: 50,   color: "#94a3b8" },
  { rank: "BRONZE",      minScore: 10,   color: "#c2773f" },
  { rank: "IRON",        minScore: 0,    color: "#71717a" },
];

function getRankInfo(rankName: string) {
  return RANK_THRESHOLDS.find(t => t.rank === rankName) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

function RankIcon({ rank, size = 20 }: { rank: string; size?: number }) {
  const info = getRankInfo(rank);
  return (
    <div
      className="flex items-center justify-center rounded-full font-black border-2 shrink-0 bg-[#0f172a]"
      style={{
        width: size,
        height: size,
        color: info.color,
        borderColor: info.color,
        fontSize: size * 0.4,
      }}
    >
      {rank[0] || 'I'}
    </div>
  );
}

export default function Header() {
  const { user, initializeSession } = useGameStore();
  const [showProfile, setShowProfile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Always sync user from server on mount so Score is never stale
  useEffect(() => {
    setMounted(true);
    initializeSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <header className="w-full flex items-center justify-between px-6 py-3 bg-[#1E293B] text-white shadow-md z-50">
      {/* Left: Logo */}
      <Link href="/" className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]">
        <div className="relative">
          <img 
            src="/img/logo.png" 
            alt="Poro Guess Logo" 
            className="w-11 h-11 object-contain rounded-full border border-white/20 transition-transform duration-200 group-hover:rotate-6" 
          />
        </div>
        <div className="flex flex-col justify-center -space-y-1">
          <span className="text-2xl tracking-wider flex items-center">
            <span className="font-black text-blue-400">PORO</span>
            <span className="font-light text-zinc-200">GUESS</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-blue-300 font-medium">Daily LoL Challenge</span>
        </div>
      </Link>

      {/* Center: Navigation Links */}
      <div className="flex-1 flex justify-center gap-8 hidden md:flex">
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
      {mounted && user && (() => {
        const rankInfo = getRankInfo(user.rank || 'IRON');
        return (
          <div
            className="flex items-center gap-3 bg-[#1e232d] hover:bg-[#252b36] transition-colors px-3 py-1.5 rounded-full border border-zinc-700/50 cursor-pointer group"
            onClick={() => setShowProfile(prev => !prev)}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <img 
                src={"/img/default-avatar.png"} 
                alt={user.username} 
                className="w-10 h-10 rounded-full object-cover border-2 transition-transform duration-200 group-hover:scale-105"
                style={{ borderColor: rankInfo.color }}
              />
              <div className="absolute -bottom-1 -right-1 bg-[#1e232d] rounded-full">
                <RankIcon rank={user.rank || 'IRON'} size={18} />
              </div>
            </div>

            {/* User Info */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wide" style={{ color: rankInfo.color }}>
                  {user.username}
                </span>
                {user.streak > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30">
                    <span className="text-[10px]">🔥</span>
                    <span className="text-[10px] text-orange-400 font-bold leading-none">{user.streak}</span>
                  </div>
                )}
              </div>
              <div className="mt-0.5">
                <span className="text-[11px] text-yellow-500 font-bold tracking-wider leading-none">SCORE: {user.score ?? 0}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </header>

      {/* Profile Modal */}
      {mounted && user && (
        <ProfileModal
          show={showProfile}
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}
