"use client";

import { useEffect, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { UserService, LeaderboardUserResponse } from "../utils/api";
import { getImageUrl } from "../utils/image";

const RANK_THRESHOLDS = [
  { rank: "CHALLENGER",  minScore: 2800, color: "#00e5ff", glow: "rgba(0,229,255,0.4)" },
  { rank: "GRANDMASTER", minScore: 1800, color: "#ff4444", glow: "rgba(255,68,68,0.4)" },
  { rank: "MASTER",      minScore: 1200, color: "#a855f7", glow: "rgba(168,85,247,0.4)" },
  { rank: "DIAMOND",     minScore: 750,  color: "#60a5fa", glow: "rgba(96,165,250,0.4)" },
  { rank: "EMERALD",     minScore: 450,  color: "#10b981", glow: "rgba(16,185,129,0.4)" },
  { rank: "PLATINUM",    minScore: 250,  color: "#2dd4bf", glow: "rgba(45,212,191,0.4)" },
  { rank: "GOLD",        minScore: 120,  color: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
  { rank: "SILVER",      minScore: 50,   color: "#94a3b8", glow: "rgba(148,163,184,0.4)" },
  { rank: "BRONZE",      minScore: 10,   color: "#c2773f", glow: "rgba(194,119,63,0.4)" },
  { rank: "IRON",        minScore: 0,    color: "#71717a", glow: "rgba(113,113,122,0.4)" },
];

function RankIcon({ rank, size = 28 }: { rank: string; size?: number }) {
  const info = RANK_THRESHOLDS.find(t => t.rank === rank) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  return (
    <div
      className="flex items-center justify-center rounded-full font-black border-2 shrink-0"
      style={{
        width: size,
        height: size,
        color: info.color,
        borderColor: info.color,
        boxShadow: `0 0 8px ${info.glow}`,
        fontSize: size * 0.36,
      }}
    >
      {rank[0]}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useGameStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await UserService.getLeaderboard(1);
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="flex flex-col flex-1 selection:bg-blue-500/30">
      <Header />
      
      <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-block px-14 py-8 rounded-3xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
            <div className="relative z-10">
              <h1 className="text-5xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-md mb-4">
                LEADERBOARD
              </h1>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-950/50 border border-blue-500/30 shadow-inner">
                <span className="text-blue-300 font-bold tracking-[0.2em] text-xs uppercase">🏆 TOP 500 PLAYERS 🏆</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-[#1e293b]/95 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Row */}
          <div className="flex items-center px-6 py-4 border-b border-white/10 bg-white/5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <div className="w-16 text-center">Rank</div>
            <div className="flex-1">Player</div>
            <div className="w-24 text-center hidden sm:block">Streak</div>
            <div className="w-24 text-right">Score</div>
          </div>

          {/* List */}
          <div className="w-full h-[600px] overflow-y-auto overflow-x-hidden custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No players found.
              </div>
            ) : (
              leaderboard.map((player, index) => {
                const isCurrentUser = user?.id === player.id;
                const position = index + 1;
                
                let positionColor = "text-zinc-400";
                let nameColor = "text-white";
                let rowBg = isCurrentUser ? "bg-blue-900/20" : "hover:bg-white/[0.02]";
                let rowBorder = isCurrentUser ? "border-l-4 border-blue-500" : "border-l-4 border-transparent";
                
                if (position === 1) {
                  positionColor = "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
                  nameColor = "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]";
                  if (!isCurrentUser) rowBg = "bg-yellow-500/5 hover:bg-yellow-500/10";
                } else if (position === 2) {
                  positionColor = "text-zinc-300 font-bold drop-shadow-[0_0_8px_rgba(212,212,216,0.5)]";
                  nameColor = "text-zinc-300 font-bold drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]";
                  if (!isCurrentUser) rowBg = "bg-zinc-300/5 hover:bg-zinc-300/10";
                } else if (position === 3) {
                  positionColor = "text-amber-600 font-bold drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]";
                  nameColor = "text-amber-600 font-bold drop-shadow-[0_0_8px_rgba(217,119,6,0.3)]";
                  if (!isCurrentUser) rowBg = "bg-amber-600/5 hover:bg-amber-600/10";
                }

                return (
                  <div
                    key={player.id}
                    className={`flex items-center px-6 py-4 border-b border-white/5 transition-colors ${rowBg} ${rowBorder}`}
                  >
                    <div className={`w-16 text-center text-lg ${positionColor}`}>
                      #{position}
                    </div>
                    
                    <div className="flex-1 flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={getImageUrl(player.iconPath)} 
                          alt={player.username} 
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                          onError={(e) => (e.currentTarget.src = "/img/default-avatar.png")}
                        />
                        <div className="absolute -bottom-2 -right-2 bg-[#0f172a] rounded-full p-0.5">
                          <RankIcon rank={player.rank} size={20} />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-lg tracking-wide ${nameColor}`}>
                          {player.username}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {player.rank}
                        </span>
                      </div>
                    </div>

                    <div className="w-24 flex justify-center hidden sm:flex">
                      {player.streak > 0 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25">
                          <span className="animate-pulse">🔥</span>
                          <span className="text-orange-400 font-bold text-sm">{player.streak}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </div>

                    <div className="w-24 text-right">
                      <span className="text-xl font-bold text-white tracking-widest">{player.score}</span>
                      <span className="text-xs text-zinc-500 ml-1">pts</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
