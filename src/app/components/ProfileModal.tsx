"use client";

import { useState, useEffect, useRef } from "react";
import {
  DailyChallengeService,
  UserProgressService,
  type UserProfileResponse,
  type DailyChallengeResponse,
  type UserProgressResponse,
} from "../utils/api";

// ── Rank helpers ──────────────────────────────────────────────────────────────
const RANK_THRESHOLDS = [
  { rank: "CHALLENGER",  minScore: 2800, nextScore: Infinity, color: "#00e5ff" },
  { rank: "GRANDMASTER", minScore: 1800, nextScore: 2800,     color: "#ff4444" },
  { rank: "MASTER",      minScore: 1200, nextScore: 1800,     color: "#a855f7" },
  { rank: "DIAMOND",     minScore: 750,  nextScore: 1200,     color: "#60a5fa" },
  { rank: "EMERALD",     minScore: 450,  nextScore: 750,      color: "#10b981" },
  { rank: "PLATINUM",    minScore: 250,  nextScore: 450,      color: "#2dd4bf" },
  { rank: "GOLD",        minScore: 120,  nextScore: 250,      color: "#f59e0b" },
  { rank: "SILVER",      minScore: 50,   nextScore: 120,      color: "#94a3b8" },
  { rank: "BRONZE",      minScore: 10,   nextScore: 50,       color: "#c2773f" },
  { rank: "IRON",        minScore: 0,    nextScore: 10,       color: "#71717a" },
];

function getRankInfo(rankName: string) {
  return RANK_THRESHOLDS.find(t => t.rank === rankName) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

function getRankProgress(score: number, rankName: string): number {
  const info = RANK_THRESHOLDS.find(t => t.rank === rankName) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  if (info.nextScore === Infinity) return 100;
  const range = info.nextScore - info.minScore;
  const gained = score - info.minScore;
  return Math.min(100, Math.max(0, (gained / range) * 100));
}

function getNextRank(rankName: string) {
  const idx = RANK_THRESHOLDS.findIndex(t => t.rank === rankName);
  return idx > 0 ? RANK_THRESHOLDS[idx - 1] : null;
}

function RankIcon({ rank, size = 32 }: { rank: string; size?: number }) {
  const info = getRankInfo(rank);
  return (
    <div
      className="flex items-center justify-center rounded-full font-black border-2 shrink-0 bg-[#0f172a]"
      style={{ width: size, height: size, color: info.color, borderColor: info.color, fontSize: size * 0.38 }}
    >
      {rank[0] || "I"}
    </div>
  );
}

// ── Mode definitions ──────────────────────────────────────────────────────────
const MODES = [
  { key: "CLASSIC", label: "Classic",       icon: "🧩" },
  { key: "TRAITS",  label: "Traits",        icon: "🔮" },
  { key: "JIGSAW",  label: "Splash Jigsaw", icon: "🖼️" },
  { key: "MATCHER", label: "Icon Matcher",  icon: "🃏" },
];

// ── ModeCard ──────────────────────────────────────────────────────────────────
function ModeCard({
  mode,
  challenge,
  progress,
  loading,
}: {
  mode: typeof MODES[0];
  challenge: DailyChallengeResponse | undefined;
  progress: UserProgressResponse | null | undefined;
  loading: boolean;
}) {
  const isWon = progress?.isWon ?? false;

  let statusLabel = "Not played";
  let statusColor = "text-zinc-500";

  if (loading) {
    statusLabel = "Loading…";
  } else if (!challenge) {
    statusLabel = "No challenge";
    statusColor = "text-zinc-600";
  } else if (isWon) {
    statusLabel = "Completed ✓";
    statusColor = "text-emerald-400";
  } else if (progress) {
    const guesses = progress.guesses?.length ?? 0;
    statusLabel = `In progress (${guesses} guess${guesses !== 1 ? "es" : ""})`;
    statusColor = "text-yellow-400";
  }

  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
        isWon
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-zinc-800/40 border-zinc-700/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg leading-none">{mode.icon}</span>
        <div>
          <p className="text-sm font-semibold text-white leading-none">{mode.label}</p>
          <p className={`text-xs mt-0.5 ${statusColor}`}>{statusLabel}</p>
        </div>
      </div>
      {isWon && progress?.scoreGained != null && (
        <span className="text-sm font-black text-yellow-400 shrink-0">
          +{progress.scoreGained} PTS
        </span>
      )}
      {!isWon && !loading && challenge && (
        <div className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
      )}
      {isWon && progress?.scoreGained == null && (
        <span className="text-xs text-emerald-500 shrink-0 font-bold">✓</span>
      )}
    </div>
  );
}

// ── Main ProfileModal ─────────────────────────────────────────────────────────
interface ProfileModalProps {
  show: boolean;
  user: UserProfileResponse;
  onClose: () => void;
}

export default function ProfileModal({ show, user, onClose }: ProfileModalProps) {
  const [challenges, setChallenges] = useState<DailyChallengeResponse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressResponse | null>>({});
  const [loading, setLoading] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!show || hasLoaded.current) return;
    hasLoaded.current = true;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const chs = await DailyChallengeService.getAll();
        setChallenges(chs);

        const entries = await Promise.all(
          chs.map(async (c) => {
            try {
              const prog = await UserProgressService.getProgress(user.id, c.id);
              return [c.mode, prog] as [string, UserProgressResponse];
            } catch {
              return [c.mode, null] as [string, null];
            }
          })
        );
        setProgressMap(Object.fromEntries(entries));
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [show, user.id]);

  // Reset on close so next open re-fetches
  useEffect(() => {
    if (!show) {
      hasLoaded.current = false;
      setChallenges([]);
      setProgressMap({});
    }
  }, [show]);

  if (!show) return null;

  const rankInfo  = getRankInfo(user.rank || "IRON");
  const nextRank  = getNextRank(user.rank || "IRON");
  const currentScore = user.score ?? 0;
  const barWidth  = getRankProgress(currentScore, user.rank || "IRON");
  const ptsToNext = nextRank ? nextRank.minScore - currentScore : 0;

  const totalTodayPts = Object.values(progressMap).reduce(
    (sum, p) => sum + (p?.scoreGained ?? 0),
    0
  );

  return (
    <>
      {/* Backdrop & Centered Container */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
        onClick={onClose}
        style={{ animation: "slideDown 0.2s ease forwards" }}
      >
        {/* Modal Panel */}
        <div
          className="w-full max-w-[520px] rounded-[2rem] bg-[#0d1524] border border-zinc-800 shadow-2xl relative flex flex-col transform-gpu"
          style={{ 
            animation: "answerDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            willChange: "transform, opacity"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── User Header ── */}
          <div className="p-6 pb-2 flex items-start gap-4 relative z-10">
            <div className="relative shrink-0">
              <img
                src="/img/default-avatar.png"
                alt={user.username}
                className="w-20 h-20 rounded-full object-cover border-4 shadow-lg bg-[#0d1524]"
                style={{ borderColor: rankInfo.color }}
              />
              <div className="absolute -bottom-2 -right-2 bg-[#0d1524] rounded-full p-1 shadow-md">
                <RankIcon rank={user.rank || "IRON"} size={26} />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-2xl font-black truncate tracking-wide drop-shadow-sm" style={{ color: rankInfo.color }}>
                {user.username}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm font-bold tracking-widest uppercase text-zinc-400">
                  {user.rank || "IRON"}
                </span>
                <span className="text-sm text-yellow-400 font-bold px-2 py-0.5 bg-yellow-400/10 rounded-md border border-yellow-400/20">
                  {currentScore} PTS
                </span>
              </div>
              {user.streak > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                  <span className="text-xs">🔥</span>
                  <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">
                    {user.streak} Day Streak
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-700/50 p-2 rounded-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Rank Progress Bar ── */}
          <div className="px-6 pb-6 pt-2 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: rankInfo.color }}>
                {user.rank || "IRON"}
              </span>
              {nextRank ? (
                <span className="text-xs text-zinc-400 font-medium tracking-wide">
                  <span className="text-zinc-200 font-bold">{ptsToNext} PTS</span> to {nextRank.rank}
                </span>
              ) : (
                <span className="text-xs text-yellow-400 font-bold tracking-widest">MAX RANK ✓</span>
              )}
            </div>
            <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden shadow-inner border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${barWidth}%`, 
                  backgroundColor: rankInfo.color,
                  boxShadow: `0 0 10px ${rankInfo.color}80`
                }}
              />
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-zinc-700/60 shadow-[0_-1px_2px_rgba(0,0,0,0.5)] z-10" />

          {/* ── Today's Games ── */}
          <div className="p-6 bg-[#0f172a]/50 relative z-10 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <span>🎮</span> Today&apos;s Games
              </h3>
              {totalTodayPts > 0 && (
                <span className="text-sm font-black text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 shadow-sm">
                  +{totalTodayPts} PTS
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((mode) => {
                const challenge = challenges.find((c) => c.mode === mode.key);
                const prog = progressMap[mode.key];
                return (
                  <ModeCard
                    key={mode.key}
                    mode={mode}
                    challenge={challenge}
                    progress={prog}
                    loading={loading}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
