"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { getImageUrl } from "../utils/image";
import { DailyChallengeService, UserProgressService } from "../utils/api";
import CountdownTimer from "../components/CountdownTimer";
import VictoryModal from "../components/VictoryModal";
import TutorialModal from "../components/TutorialModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CardData {
  uid: string;
  championId: number;
  iconPath: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcScore(s: number): number {
  if (s < 40) return 10;
  if (s < 60) return 5;
  return 2;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Isolated Timer (doesn't cause board re-renders) ───────────────────────────
const GameTimer = memo(function GameTimer({
  running,
  onTick,
}: {
  running: boolean;
  onTick: (s: number) => void;
}) {
  const [display, setDisplay] = useState("00:00");
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        const s = elapsedRef.current;
        setDisplay(fmtTime(s));
        onTick(s);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onTick]);

  const color =
    elapsedRef.current >= 60
      ? "text-rose-400"
      : elapsedRef.current >= 40
      ? "text-amber-400"
      : "text-emerald-400";

  return <span className={`text-2xl font-mono font-bold ${color}`}>{display}</span>;
});

// ── Card (purely presentational – never re-renders after mount) ───────────────
// Flip state is driven by imperative DOM manipulation (style.transform),
// NOT by React state, so zero re-renders happen during card interactions.
const Card = memo(function Card({
  card,
  flipperRef,
  onClick,
}: {
  card: CardData;
  flipperRef: (el: HTMLDivElement | null) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-square outline-none focus:outline-none card-btn"
      aria-label={card.name}
      style={{ perspective: "800px" }}
    >
      <div
        ref={flipperRef}
        className="card-flipper"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.22s ease-out",
          transform: "rotateY(0deg)",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Back */}
        <div
          className="card-back"
          style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
        >
          <div className="w-5 h-5 rounded-full bg-blue-500/10" />
        </div>

        {/* Front */}
        <div
          style={{
            backfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            transform: "rotateY(180deg)",
          }}
          className="rounded-xl border-2 border-yellow-400/70 overflow-hidden shadow-[0_0_8px_rgba(234,179,8,0.3)]"
        >
          <img
            src={card.iconPath}
            alt={card.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => (e.currentTarget.src = "/img/Red.png")}
          />
        </div>
      </div>
    </button>
  );
});

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MatcherPage() {
  const { user, championsList, initializeSession, fetchInitialData, triggerVictoryModal, showVictoryModalMode, clearVictoryModal, refreshUser } = useGameStore();

  const [cards, setCards] = useState<CardData[]>([]);
  const [matchedUids, setMatchedUids] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [matcherChallengeId, setMatcherChallengeId] = useState<number | null>(null);

  // ── Imperative refs for DOM-driven flip (zero React re-renders) ──
  const flipperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const flippedStack = useRef<Array<{ uid: string; championId: number }>>([]);
  const flipBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movesRef = useRef(0);
  const elapsedRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const gameOverRef = useRef(false);
  const alreadyCompletedRef = useRef(false);
  const gameStartedRef = useRef(false);
  const matchedCountRef = useRef(0);
  const matcherChallengeIdRef = useRef<number | null>(null);

  // ── Init ──
  useEffect(() => {
    initializeSession().then(() => fetchInitialData());
  }, []);

  useEffect(() => {
    if (!user || championsList.length === 0) return;
    const setup = async () => {
      try {
        const challenges = await DailyChallengeService.getAll();
        const matcher = challenges.find((c) => c.mode === "MATCHER");
        if (!matcher) return;
        setMatcherChallengeId(matcher.id);
        matcherChallengeIdRef.current = matcher.id;

        try {
          const prog = await UserProgressService.getProgress(user.id, matcher.id);
          if (prog?.isWon) {
            setAlreadyCompleted(true);
            alreadyCompletedRef.current = true;
            setProgress(prog);
            setElapsed(prog.timeElapsed ?? 0);
            setMoves(prog.moves ?? 0);
            setScore(calcScore(prog.timeElapsed ?? 0));
            setGameOver(true);
            return;
          }
        } catch { /* 404 = no progress */ }

        const ids: number[] = matcher.matcherChampions ?? [];
        let picked = ids
          .slice(0, 16)
          .map((id) => championsList.find((c) => c.id === id))
          .filter(Boolean) as typeof championsList;
        if (picked.length < 16) picked = shuffle(championsList).slice(0, 16);

        const deck: CardData[] = shuffle([
          ...picked.map((c) => ({ uid: `${c.id}_a`, championId: c.id, iconPath: getImageUrl(c.iconPath), name: c.name })),
          ...picked.map((c) => ({ uid: `${c.id}_b`, championId: c.id, iconPath: getImageUrl(c.iconPath), name: c.name })),
        ]);
        setCards(deck);
      } catch (e) { console.error("Failed to setup matcher", e); }
    };
    setup();
  }, [user, championsList]);

  // ── Timer tick (stable callback) ──
  const handleTick = useCallback((s: number) => {
    elapsedRef.current = s;
    setElapsed(s);
  }, []);

  // ── Win ──
  const handleWin = useCallback(async () => {
    const finalTime = elapsedRef.current;
    const finalMoves = movesRef.current;
    const finalScore = calcScore(finalTime);
    gameOverRef.current = true;
    setScore(finalScore);
    setGameOver(true);

    const chalId = matcherChallengeIdRef.current;
    const uid = user?.id;
    if (!chalId || !uid || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiBase}/user-progress/${uid}/${chalId}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWon: true, timeElapsed: finalTime, moves: finalMoves, score: finalScore }),
      });
      const data = await res.json();
      setProgress(data?.data ?? data);
    } catch (e) { console.error("Failed to submit", e); }
    isSubmittingRef.current = false;

    setTimeout(() => { refreshUser(); triggerVictoryModal("MATCHER"); }, 600);
  }, [user, refreshUser, triggerVictoryModal]);

  // ── Imperative card click (NO state changes during flip → 0 re-renders) ──
  const getClickHandler = useCallback((uid: string, championId: number) => {
    return () => {
      if (gameOverRef.current || alreadyCompletedRef.current) return;
      if (!gameStartedRef.current) {
        gameStartedRef.current = true;
        setGameStarted(true);
      }

      // Already in stack? ignore
      if (flippedStack.current.find((f) => f.uid === uid)) return;

      // Get the DOM element for this card
      const el = flipperRefs.current[uid];

      if (flippedStack.current.length === 2) {
        // 3rd click: instantly close previous 2, open this one
        if (flipBackTimer.current) { clearTimeout(flipBackTimer.current); flipBackTimer.current = null; }
        flippedStack.current.forEach(({ uid: fuid }) => {
          const fel = flipperRefs.current[fuid];
          if (fel) fel.style.transform = "rotateY(0deg)";
        });
        flippedStack.current = [];
      }

      // Flip this card (direct DOM — no React re-render)
      if (el) el.style.transform = "rotateY(180deg)";
      flippedStack.current.push({ uid, championId });

      if (flippedStack.current.length === 2) {
        movesRef.current++;
        setMoves(movesRef.current); // 1 re-render for the counter, isolated

        const [first, second] = flippedStack.current;
        if (first.championId === second.championId) {
          // ✅ Match
          flippedStack.current = [];
          matchedCountRef.current++;

          // Style matched cards via DOM
          [first.uid, second.uid].forEach((muid) => {
            const mel = flipperRefs.current[muid];
            if (mel) {
              const back = mel.querySelector(".card-back") as HTMLElement | null;
              if (back) { back.style.borderColor = "rgba(16,185,129,0.6)"; back.style.backgroundColor = "rgba(16,185,129,0.1)"; }
              const front = mel.querySelector(".rounded-xl") as HTMLElement | null;
              if (front) front.style.borderColor = "rgba(16,185,129,0.6)";
              // Add ✓ overlay via DOM
              const overlay = document.createElement("div");
              overlay.style.cssText = "position:absolute;inset:0;background:rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#6ee7b7;";
              overlay.textContent = "✓";
              mel.appendChild(overlay);
            }
          });

          setMatchedCount(matchedCountRef.current);

          if (matchedCountRef.current === 16) {
            handleWin();
          }
        } else {
          // ❌ No match — schedule flip back
          flipBackTimer.current = setTimeout(() => {
            [first, second].forEach(({ uid: fuid }) => {
              const fel = flipperRefs.current[fuid];
              if (fel) fel.style.transform = "rotateY(0deg)";
            });
            flippedStack.current = [];
            flipBackTimer.current = null;
          }, 800);
        }
      }
    };
  }, [handleWin]);

  // ── Stable flipper ref setter per card ──
  const getFlipperRef = useCallback((uid: string) => {
    return (el: HTMLDivElement | null) => { flipperRefs.current[uid] = el; };
  }, []);

  // ── Victory modal ──
  useEffect(() => {
    if (showVictoryModalMode === "MATCHER") { setShowModal(true); clearVictoryModal(); }
  }, [showVictoryModalMode]);

  // ── Loading ──
  if (!user || championsList.length === 0 || (cards.length === 0 && !alreadyCompleted)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">Loading Game...</h1>
      </div>
    );
  }

  const totalPairs = 16;
  const progressPct = (matchedCount / totalPairs) * 100;
  const currentScore = score ?? (elapsed < 40 ? 10 : elapsed < 60 ? 5 : 2);

  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-4 container mx-auto xl:pt-[90px] pt-[40px] select-none text-white z-10 relative px-4">

        {/* Stats Card */}
        <div className="flex flex-col items-center w-full bg-[#1E293B] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-5xl mb-5 relative">
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="How to play"
          >
            ?
          </button>

          <h1 className="text-3xl md:text-4xl font-semibold mb-1 text-center tracking-wide">
            Champion <span className="text-blue-400 font-light">Icon Matcher</span>
          </h1>
          <p className="text-zinc-400 text-sm mb-4">Match all 16 pairs of champion icons as fast as you can!</p>

          <div className="flex items-center justify-center gap-6 md:gap-12 w-full flex-wrap">
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Time</span>
              <GameTimer running={gameStarted && !gameOver} onTick={handleTick} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pairs</span>
              <span className="text-2xl font-mono font-bold text-blue-400">{matchedCount}/{totalPairs}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Moves</span>
              <span className="text-2xl font-mono font-bold text-zinc-200">{moves}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Score</span>
              <span className="text-2xl font-mono font-bold text-yellow-400">
                {currentScore}<span className="text-zinc-500 text-sm font-normal"> pts</span>
              </span>
            </div>
          </div>

          <div className="w-full mt-4 bg-zinc-700/40 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />&lt;40s = 10 pts</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />&lt;60s = 5 pts</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />60s+ = 2 pts</span>
          </div>
        </div>

        {alreadyCompleted ? (
          <div className="flex flex-col items-center bg-[#1E293B] border border-emerald-500/30 p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center gap-3">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-bold text-emerald-400">Already Completed!</h2>
            <p className="text-zinc-400 text-sm">You already matched all pairs today.</p>
            <div className="flex gap-8 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Time</span>
                <span className="text-xl font-mono font-bold text-zinc-200">{fmtTime(elapsed)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Moves</span>
                <span className="text-xl font-mono font-bold text-zinc-200">{moves}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Score</span>
                <span className="text-xl font-mono font-bold text-yellow-400">{score} pts</span>
              </div>
            </div>
            <CountdownTimer className="text-zinc-500 text-sm mt-2" />
          </div>
        ) : (
          <>
            {gameOver && (
              <div className="mb-4 flex flex-col items-center gap-1 animate-fade-in">
                <p className="text-emerald-400 font-bold text-xl">
                  🎉 Completed in {fmtTime(elapsed)} — {moves} moves — <span className="text-yellow-400">{score} pts!</span>
                </p>
              </div>
            )}

            {/* Board: no backdrop-blur, solid bg for performance */}
            <div className="w-full max-w-5xl bg-[#1E293B] border border-white/10 p-4 md:p-5 rounded-3xl shadow-2xl">
              <div className="grid grid-cols-8 gap-2 md:gap-3">
                {cards.map((card) => (
                  <Card
                    key={card.uid}
                    card={card}
                    flipperRef={getFlipperRef(card.uid)}
                    onClick={getClickHandler(card.uid, card.championId)}
                  />
                ))}
              </div>
            </div>

            {!gameStarted && (
              <p className="mt-4 text-zinc-500 text-sm animate-pulse">👆 Tap any card to start the timer!</p>
            )}
            {gameOver && (
              <div className="mt-4"><CountdownTimer className="text-zinc-500 text-sm" /></div>
            )}
          </>
        )}

        <VictoryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          isWon={true}
          targetChamp={null}
          progress={progress}
          mode="MATCHER"
          matcherScore={score ?? 0}
        />

        <TutorialModal 
          show={showTutorial} 
          onClose={() => setShowTutorial(false)}
          title="How to Play: Icon Matcher"
          content={
            <div className="space-y-4">
              <p>Welcome to the <strong className="text-white">Champion Icon Matcher</strong>!</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your goal is to find and match all <strong className="text-blue-400">16 pairs</strong> of champion icons.</li>
                <li>Tap any card to flip it over. Tap another card to see if they match.</li>
                <li>If they match, they will stay face up. If not, they will flip back over.</li>
                <li>The timer starts as soon as you tap the first card.</li>
              </ul>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mt-4">
                <h3 className="font-bold text-white mb-2">Scoring System</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Under 40 seconds = <strong className="text-emerald-400">10 pts</strong></li>
                  <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Under 60 seconds = <strong className="text-amber-400">5 pts</strong></li>
                  <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Over 60 seconds = <strong className="text-rose-400">2 pts</strong></li>
                </ul>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Finish as fast as you can to earn maximum points and climb the leaderboard!</p>
            </div>
          }
        />
      </main>
      <Footer />
    </>
  );
}
