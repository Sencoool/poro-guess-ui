"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChampionEntity, UserProgressResponse, DailyChallengeService, UserProgressService } from "../utils/api";
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

function getProgressPct(score: number, rankInfo: typeof RANK_THRESHOLDS[0]) {
  const currentIdx = RANK_THRESHOLDS.findIndex(t => t.rank === rankInfo.rank);
  const nextRank = currentIdx > 0 ? RANK_THRESHOLDS[currentIdx - 1] : null;
  if (!nextRank) return 100;
  const range = nextRank.minScore - rankInfo.minScore;
  const progress = score - rankInfo.minScore;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

type AnimationPhase = 'IDLE' | 'FILLING_OLD' | 'PAUSE_FLASH' | 'RESET_BAR' | 'FILLING_NEW' | 'DONE';

function AnimatedNumberSpan({ value, duration = 600, className }: { value: number, duration?: number, className?: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const currentValue = useRef(value);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (value === currentValue.current && hasAnimated.current) {
      if (spanRef.current) spanRef.current.textContent = value.toString();
      return;
    }
    hasAnimated.current = true;
    
    const startVal = currentValue.current;
    let startTs: number | null = null;
    let reqId: number;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const easeP = 1 - Math.pow(1 - p, 3); // cubic ease-out
      currentValue.current = Math.floor(easeP * (value - startVal) + startVal);
      if (spanRef.current) {
        spanRef.current.textContent = currentValue.current.toString();
      }
      
      if (p < 1) {
        reqId = requestAnimationFrame(step);
      }
    };
    
    reqId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(reqId);
  }, [value, duration]);

  return <span ref={spanRef} className={className}>{currentValue.current}</span>;
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
  jigsawScore?: number;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function VictoryModal({
  show, onClose, isWon, targetChamp, progress, mode, traitsScore, matcherScore, jigsawScore
}: VictoryModalProps) {
  const { user, refreshUser } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [completedModes, setCompletedModes] = useState<Record<string, boolean>>({});
  const [showRankUp, setShowRankUp] = useState(false);
  
  const hasRefreshed = useRef(false);

  // ── Score resolution ────────────────────────────────────────────────────────
  const guessCount = progress?.guesses?.length ?? 0;

  const scoreGained = progress?.scoreGained != null
    ? progress.scoreGained
    : (() => {
        if (!isWon) return 0;
        if (mode === "CLASSIC") return Math.max(1, 5 - (guessCount - 1));
        if (mode === "TRAITS")  return traitsScore ?? 0;
        if (mode === "MATCHER") return matcherScore ?? 0;
        if (mode === "JIGSAW")  return jigsawScore ?? 10;
        return 1;
      })();

  const seedOldScore = progress?.oldScore != null
    ? progress.oldScore
    : Math.max(0, (user?.score ?? 0) - scoreGained);

  const seedNewScore = progress?.newScore != null
    ? progress.newScore
    : isWon ? seedOldScore + scoreGained : seedOldScore;

  const oldRankInfo = getRankInfo(seedOldScore);
  const finalRankInfo = getRankInfo(seedNewScore);
  const isRankedUp = oldRankInfo.rank !== finalRankInfo.rank;
  const oldRankMax = getNextRankInfo(oldRankInfo.rank)?.minScore ?? seedNewScore;
  const streakIncreased = progress?.newStreak && progress?.oldStreak !== undefined && progress.newStreak > progress.oldStreak;

  // ── State for Animation ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');

  // ── Effect: Complex Animation Loop ───────────────────────────────────────────
  useEffect(() => {
    if (!show) {
      setPhase('IDLE');
      setShowRankUp(false);
      hasRefreshed.current = false;
      return;
    }

    if (phase === 'IDLE') {
      const t = setTimeout(() => {
        if (seedNewScore > seedOldScore) {
          setPhase(isRankedUp ? 'FILLING_OLD' : 'FILLING_NEW');
        } else {
          setPhase('DONE');
        }
      }, 500); // Wait 0.5s before starting the fill
      return () => clearTimeout(t);
    }

    if (phase === 'FILLING_OLD') {
      const t = setTimeout(() => {
        setPhase('PAUSE_FLASH');
      }, 600); // Wait for the 600ms CSS transition to finish
      return () => clearTimeout(t);
    }

    if (phase === 'PAUSE_FLASH') {
      // Trigger the external Rank Up Overlay
      if (progress?.oldRank && progress?.newRank && progress.oldRank !== progress.newRank) {
        setShowRankUp(true);
        setTimeout(() => setShowRankUp(false), 4000);
      }
      
      const t = setTimeout(() => {
        setPhase('RESET_BAR');
      }, 1000); // Pause for 1s while the icon flashes
      return () => clearTimeout(t);
    }

    if (phase === 'RESET_BAR') {
      const t = setTimeout(() => {
        setPhase('FILLING_NEW');
      }, 50); // 50ms to allow CSS to snap to 0 with transition-none
      return () => clearTimeout(t);
    }

    if (phase === 'FILLING_NEW') {
      const startScore = isRankedUp ? oldRankMax : seedOldScore;
      if (startScore >= seedNewScore) {
        setPhase('DONE');
        return;
      }
      
      const t = setTimeout(() => {
        setPhase('DONE');
      }, 600);
      return () => clearTimeout(t);
    }
  }, [show, phase, seedOldScore, seedNewScore, isRankedUp, oldRankMax, progress?.oldRank, progress?.newRank]); 

  // ── Effect: refresh user after animation completes ───────────────────────────
  useEffect(() => {
    if (!show || hasRefreshed.current || phase !== 'DONE') return;
    hasRefreshed.current = true;
    const t = setTimeout(() => refreshUser(), 1000);
    return () => clearTimeout(t);
  }, [show, phase, refreshUser]);

  // Fetch completion status for all modes
  useEffect(() => {
    if (show && user) {
      const fetchStatuses = async () => {
        try {
          const challenges = await DailyChallengeService.getAll();
          const statuses: Record<string, boolean> = {};
          
          await Promise.all(challenges.map(async (c) => {
            try {
              const prog = await UserProgressService.getProgress(user.id, c.id);
              if (prog?.isWon) {
                statuses[c.mode] = true;
              }
            } catch {
              // 404 means not played yet
              statuses[c.mode] = false;
            }
          }));
          
          // Also mark the current mode as done (optimistic)
          if (isWon) {
            statuses[mode] = true;
          }
          
          setCompletedModes(statuses);
        } catch (e) {
          console.error("Failed to fetch completion statuses", e);
        }
      };
      fetchStatuses();
    }
  }, [show, user, mode, isWon]);

  if (!show || (!targetChamp && mode !== "MATCHER")) return null;

  // ── Visual Derivations for Render ──────────────────────────────────────────
  const visualRankInfo = (phase === 'IDLE' || phase === 'FILLING_OLD' || phase === 'PAUSE_FLASH') ? oldRankInfo : finalRankInfo;
  const visualNextRankInfo = getNextRankInfo(visualRankInfo.rank);
  
  let targetDisplayScore = seedOldScore;
  if (phase === 'FILLING_OLD' || phase === 'PAUSE_FLASH') {
    targetDisplayScore = oldRankMax;
  } else if (phase === 'FILLING_NEW' || phase === 'DONE') {
    targetDisplayScore = seedNewScore;
  }

  // Handle the RESET_BAR phase specifically
  let currentTotalWidth = getProgressPct(targetDisplayScore, visualRankInfo);
  let baseWidth = (visualRankInfo.rank === oldRankInfo.rank) ? getProgressPct(seedOldScore, visualRankInfo) : 0;
  let addedWidth = Math.max(0, currentTotalWidth - baseWidth);
  let barTransition = 'transition-all duration-[600ms] ease-out';

  if (phase === 'RESET_BAR') {
    currentTotalWidth = 0;
    baseWidth = 0;
    addedWidth = 0;
    barTransition = 'transition-none';
  }

  const ptsToNextTarget = visualNextRankInfo ? Math.max(0, visualNextRankInfo.minScore - targetDisplayScore) : 0;

  const isBouncing = phase === 'FILLING_OLD' || phase === 'FILLING_NEW';

  const handleShare = () => {
    if (!progress) return;
    const emojiMap: Record<string, string> = { MATCH: "🟩", PARTIAL: "🟨", MISMATCH: "🟥", HIGHER: "🟥", LOWER: "🟥" };
    let guessLines = "";
    if (mode === "MATCHER") {
      guessLines = `⏰ Time: ${progress?.timeElapsed || 0}s | 🔄 Moves: ${progress?.moves || 0}`;
    } else {
      guessLines = progress.guesses.map(g => {
        if (!g.comparison) return "🟥🟥🟥🟥🟥";
        return [g.comparison.gender, g.comparison.role, g.comparison.damageType, g.comparison.resource, g.comparison.rangeType]
          .map(r => emojiMap[r] ?? "🟥").join("");
      }).join("\n");
    }
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
          <div className="absolute inset-0 z-50 bg-[#0f172a]/95 flex flex-col items-center justify-center rounded-3xl animate-fade-in border border-yellow-500/50 shadow-[0_0_60px_rgba(234,179,8,0.3)]">
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
        {targetChamp ? (
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
                <span className={`text-sm font-black px-3 py-1 rounded-full border transition-all duration-300 ${
                  isBouncing 
                    ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 animate-bounce scale-110 shadow-[0_0_15px_rgba(234,179,8,0.6)]' 
                    : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                }`}>
                  +{scoreGained} PTS
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 pt-5 pb-4 gap-2">
            <div className="text-4xl mb-1">🎮</div>
            <p className="text-xl font-bold text-white tracking-wide">Awesome Memory!</p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className={`text-sm font-medium px-3 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400`}>
                Completed in {progress?.timeElapsed || 0}s with {progress?.moves || 0} moves
              </span>
              {isWon && scoreGained > 0 && (
                <span className={`text-sm font-black px-3 py-1 rounded-full border transition-all duration-300 ${
                  isBouncing 
                    ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 animate-bounce scale-110 shadow-[0_0_15px_rgba(234,179,8,0.6)]' 
                    : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                }`}>
                  +{scoreGained} PTS
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Zone 3: Rank Bar ────────────────────────────── */}
        {user && (
          <div className="w-full px-5 pb-4">
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`relative transition-all duration-300 ${phase === 'PAUSE_FLASH' ? 'scale-125' : ''}`}>
                    {phase === 'PAUSE_FLASH' && (
                      <div className="absolute inset-0 bg-white/60 blur-[10px] rounded-full animate-ping" />
                    )}
                    <RankIcon rank={visualRankInfo.rank} />
                  </div>
                  <span className="text-xs font-bold transition-colors" style={{ color: visualRankInfo.color }}>{visualRankInfo.rank}</span>
                </div>
                <AnimatedNumberSpan value={targetDisplayScore} className="text-xs text-zinc-500 font-mono" /> 
                <span className="text-xs text-zinc-500 font-mono ml-1">PTS</span>
                <div className="flex items-center gap-2">
                  {visualNextRankInfo ? (
                    <>
                      <span className="text-xs font-bold text-zinc-400 transition-colors">{visualNextRankInfo.rank}</span>
                      <RankIcon rank={visualNextRankInfo.rank} />
                    </>
                  ) : (
                    <span className="text-xs font-bold text-yellow-400">MAX ✓</span>
                  )}
                </div>
              </div>
              <div className="w-full h-2.5 bg-zinc-700/80 rounded-full overflow-hidden border border-white/5 relative">
                {/* Existing EXP (Base) */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-colors"
                  style={{
                    width: `${baseWidth}%`,
                    backgroundColor: `${visualRankInfo.color}40`,
                  }}
                />
                {/* Added EXP (Animated via CSS) */}
                <div
                  className={`absolute top-0 h-full rounded-full ${barTransition}`}
                  style={{
                    left: `${baseWidth}%`,
                    width: `${addedWidth}%`,
                    backgroundColor: visualRankInfo.color,
                    boxShadow: `0 0 10px ${visualRankInfo.glow}`,
                  }}
                >
                  {addedWidth > 0 && (
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 blur-[2px] rounded-full" />
                  )}
                </div>
              </div>
              {visualNextRankInfo && ptsToNextTarget > 0 ? (
                <p className="text-xs text-zinc-500 mt-2 text-center flex items-center justify-center gap-1">
                  <AnimatedNumberSpan value={ptsToNextTarget} className="text-zinc-300 font-semibold" /> 
                  <span>PTS needed for {visualNextRankInfo.rank}</span>
                </p>
              ) : visualNextRankInfo && ptsToNextTarget === 0 ? (
                <p className="text-xs text-emerald-400 font-bold mt-2 text-center animate-pulse tracking-wide">
                  Goal Reached!
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Zone 4: Share (Removed temporarily) ───────────────────────────────── */}

        {/* ── Zone 5: Next Step ───────────────────────────── */}
        <div className="w-full px-5 pb-5 border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 text-center font-medium">Play Next Mode</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["CLASSIC", "JIGSAW", "TRAITS", "MATCHER"] as const).map(m => {
              const isDone = completedModes[m];
              const href = m === "CLASSIC" ? "/classic" : m === "JIGSAW" ? "/jigsaw" : m === "TRAITS" ? "/traits" : "/matcher";
              const label = m === "MATCHER" ? "Icon Matcher" : m.charAt(0) + m.slice(1).toLowerCase();
              return isDone ? (
                <div key={m} className="py-2.5 px-1 text-[11px] sm:text-xs font-semibold rounded-xl text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center gap-1.5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {label}
                </div>
              ) : (
                <Link key={m} href={href} className="py-2.5 px-1 text-[11px] sm:text-xs font-semibold rounded-xl text-center bg-zinc-800/60 border border-white/10 text-zinc-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all shadow-sm">
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


