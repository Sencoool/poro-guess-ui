"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChampionEntity, UserProgressResponse } from "../utils/api";
import { getImageUrl } from "../utils/image";
import { useGameStore } from "../store/useGameStore";
import CountdownTimer from "./CountdownTimer";

// ── Rank System ──────────────────────────────────────────────────────────────
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

function getRankInfo(score: number) {
  return RANK_THRESHOLDS.find(t => score >= t.minScore) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

function getNextRankInfo(currentRank: string) {
  const idx = RANK_THRESHOLDS.findIndex(t => t.rank === currentRank);
  return idx > 0 ? RANK_THRESHOLDS[idx - 1] : null;
}

function getRankProgress(score: number): number {
  const current = getRankInfo(score);
  const currentIdx = RANK_THRESHOLDS.findIndex(t => t.rank === current.rank);
  const nextRank = currentIdx > 0 ? RANK_THRESHOLDS[currentIdx - 1] : null;
  if (!nextRank) return 100;
  const range = nextRank.minScore - current.minScore;
  const progress = score - current.minScore;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ── Rank Icon ────────────────────────────────────────────────────────────────
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


// Score formula mirrored from backend: Math.max(1, 5 - (guessCount - 1))
function calcScore(guessCount: number): number {
  return Math.max(1, 5 - (guessCount - 1));
}

// ── Props ────────────────────────────────────────────────────────────────────
interface VictoryModalProps {
  show: boolean;
  onClose: () => void;
  isWon: boolean;
  targetChamp: ChampionEntity | null;
  progress: UserProgressResponse | null;
  mode: "CLASSIC" | "JIGSAW" | "TRAITS" | "MATCHER";
  traitsScore?: number;
  matcherScore?: number;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function VictoryModal({
  show, onClose, isWon, targetChamp, progress, mode, traitsScore, matcherScore,
}: VictoryModalProps) {
  const { user, refreshUser } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const hasRefreshed = useRef(false);

  const guessCount = progress?.guesses.length ?? 0;
  const scoreGained = progress?.scoreGained ?? (
    mode === "TRAITS" ? (traitsScore ?? 0)
    : mode === "MATCHER" ? (matcherScore ?? 0)
    : isWon ? calcScore(guessCount) : 0
  );
  
  const [showRankUp, setShowRankUp] = useState(false);
  const streakIncreased = progress?.newStreak && progress?.oldStreak !== undefined && progress.newStreak > progress.oldStreak;

  // Refresh user once when modal opens to get latest score/streak/rank
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (show && !hasRefreshed.current) {
      hasRefreshed.current = true;
      // Delay the heavy state update and API call to allow the entrance animations (confetti & slide down) to run smoothly at 60fps
      timeoutId = setTimeout(() => {
        refreshUser();
      }, 1000);
    }
    if (!show) {
      hasRefreshed.current = false;
      setBarWidth(0);
      setBarWidth(0);
      setShowRankUp(false);
    }
    
    // Check for rank up
    if (show && progress?.oldRank && progress?.newRank && progress.oldRank !== progress.newRank) {
      setShowRankUp(true);
      const hideRankUp = setTimeout(() => setShowRankUp(false), 4000); // hide after 4 seconds
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(hideRankUp);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [show, refreshUser, progress]);

  // Animate bar after user data loaded
  useEffect(() => {
    if (show && user) {
      const t = setTimeout(() => setBarWidth(getRankProgress(user.score)), 500);
      return () => clearTimeout(t);
    }
  }, [show, user]);

  if (!show || !targetChamp) return null;

  const currentRankInfo = getRankInfo(user?.score ?? 0);
  const nextRankInfo = getNextRankInfo(currentRankInfo.rank);
  const ptsToNext = nextRankInfo ? nextRankInfo.minScore - (user?.score ?? 0) : 0;

  const handleShare = () => {
    if (!progress) return;
    const emojiMap: Record<string, string> = { MATCH: "🟩", PARTIAL: "🟨", MISMATCH: "🟥", HIGHER: "🟥", LOWER: "🟥" };
    const guessLines = progress.guesses.map(g => {
      if (!g.comparison) return "🟥🟥🟥🟥🟥";
      return [g.comparison.gender, g.comparison.role, g.comparison.damageType, g.comparison.resource, g.comparison.rangeType]
        .map(r => emojiMap[r] ?? "🟥").join("");
    }).join("\n");
    const streakLine = user?.streak ? `🔥 Streak: ${user.streak} Day${user.streak !== 1 ? "s" : ""}` : "";
    const text = [
      `Poro Guess - ${mode.charAt(0) + mode.slice(1).toLowerCase()} (${guessCount} ${guessCount === 1 ? "try" : "tries"})`,
      guessLines,
      streakLine,
      "playporoguess.com",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Container for perfect centering */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal */}
        <div
          className={`pointer-events-auto relative w-full max-w-sm opacity-0 rounded-3xl
            bg-[#0f172a] border overflow-y-auto max-h-[92vh] will-change-transform
            ${isWon ? "border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]" : "border-rose-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]"}`}
          style={{
            animation: "answerDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            animationDelay: "0.1s",
          }}
          onClick={e => e.stopPropagation()}
        >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-[60]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        {/* ── Rank Up Overlay ─────────────────────────────── */}
        {showRankUp && progress?.newRank && (
          <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center rounded-3xl animate-fade-in border border-yellow-500/50 shadow-[0_0_60px_rgba(234,179,8,0.3)]">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 mb-8 tracking-widest" style={{ animation: 'pulse 1.5s infinite' }}>
              RANK UP!
            </h2>
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div style={{ animation: 'answerDown 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                <RankIcon rank={progress.newRank} size={110} />
              </div>
            </div>
            <p className="mt-8 text-2xl font-bold text-white tracking-wide" style={{ animation: 'answerDown 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
              {progress.newRank}
            </p>
            <p className="mt-2 text-sm text-zinc-400">Congratulations on your new rank!</p>
          </div>
        )}

        {/* ── Zone 1: Header ──────────────────────────────── */}
        <div className={`w-full pt-6 pb-4 px-6 flex flex-col items-center gap-2 relative ${isWon ? "bg-emerald-500/8" : "bg-rose-500/8"} border-b ${isWon ? "border-emerald-500/15" : "border-rose-500/15"}`}>
          <h2 className={`text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-br ${isWon ? "from-emerald-300 to-emerald-600" : "from-rose-300 to-rose-600"}`}>
            {isWon ? "VICTORY!" : "DEFEAT"}
          </h2>
          {user && user.streak > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${streakIncreased ? "bg-orange-500/30 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse scale-105 transition-all" : "bg-orange-500/15 border border-orange-500/25"}`}>
              <span className={streakIncreased ? "animate-bounce" : ""}>🔥</span>
              <span className="text-orange-400 font-bold text-sm">{user.streak} Day{user.streak !== 1 ? "s" : ""} Streak</span>
            </div>
          )}
        </div>

        {/* ── Zone 2: Hero ────────────────────────────────── */}
        <div className="flex flex-col items-center px-6 pt-5 pb-4 gap-2">
          <div className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-xl ${isWon ? "border-emerald-500/60" : "border-rose-500/60"}`}>
            <img src={getImageUrl(targetChamp.iconPath)} alt={targetChamp.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.src = "/img/Red.png")} />
          </div>
          <p className="text-xl font-bold text-white tracking-wide">{targetChamp.name}</p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className={`text-sm font-medium px-3 py-1 rounded-full border ${isWon ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
              {isWon ? `Guessed in ${guessCount} ${guessCount === 1 ? "try" : "tries"}` : `Better luck next time!`}
            </span>
            {isWon && scoreGained > 0 && (
              <span className="text-sm font-black px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 animate-bounce">
                +{scoreGained} PTS
              </span>
            )}
          </div>
        </div>

        {/* ── Zone 3: Rank Bar ────────────────────────────── */}
        {user && (
          <div className="w-full px-5 pb-4">
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RankIcon rank={currentRankInfo.rank} />
                  <span className="text-xs font-bold" style={{ color: currentRankInfo.color }}>{currentRankInfo.rank}</span>
                </div>
                <span className="text-xs text-zinc-500">{user.score} PTS</span>
                <div className="flex items-center gap-2">
                  {nextRankInfo ? (
                    <>
                      <span className="text-xs font-bold text-zinc-400">{nextRankInfo.rank}</span>
                      <RankIcon rank={nextRankInfo.rank} />
                    </>
                  ) : (
                    <span className="text-xs font-bold text-yellow-400">MAX ✓</span>
                  )}
                </div>
              </div>
              <div className="w-full h-2.5 bg-zinc-700/80 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="absolute top-0 left-0 h-full w-full rounded-full transition-transform duration-1000 ease-out origin-left"
                  style={{
                    transform: `scaleX(${barWidth / 100})`,
                    background: `linear-gradient(90deg, ${currentRankInfo.color}60, ${currentRankInfo.color})`,
                    boxShadow: `0 0 8px ${currentRankInfo.glow}`,
                  }}
                />
              </div>
              {nextRankInfo && ptsToNext > 0 && (
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  <span className="text-zinc-300 font-semibold">{ptsToNext} PTS</span> needed for {nextRankInfo.rank}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Zone 4: Share ───────────────────────────────── */}
        <div className="w-full px-5 pb-4">
          <button
            onClick={handleShare}
            className={`w-full py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${copied ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-zinc-800/60 border-white/10 text-zinc-300 hover:bg-zinc-700/60 hover:text-white"}`}
          >
            {copied ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>Share Results</>
            )}
          </button>
        </div>

        {/* ── Zone 5: Next Step ───────────────────────────── */}
        <div className="w-full px-5 pb-5 border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 text-center font-medium">Play Next Mode</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["CLASSIC", "JIGSAW", "TRAITS"] as const).map(m => {
              const isDone = m === mode;
              const href = m === "CLASSIC" ? "/classic" : m === "JIGSAW" ? "/jigsaw" : "/traits";
              const label = m.charAt(0) + m.slice(1).toLowerCase();
              return isDone ? (
                <div key={m} className="py-2.5 text-xs font-semibold rounded-xl text-center bg-zinc-800/20 border border-white/5 text-zinc-600">
                  ✓ {label}
                </div>
              ) : (
                <Link key={m} href={href} className="py-2.5 text-xs font-semibold rounded-xl text-center bg-zinc-800/60 border border-white/10 text-zinc-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all">
                  {label}
                </Link>
              );
            })}
          </div>
          <CountdownTimer />
        </div>
      </div>
      </div>
    </>
  );
}


