"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { ChampionEntity } from "../utils/api";
import { getImageUrl } from "../utils/image";
import confetti from "canvas-confetti";
import VictoryModal from "../components/VictoryModal";
import TutorialModal from "../components/TutorialModal";
import CountdownTimer from "../components/CountdownTimer";
const GuessRow = ({ guess, index, isWon, isNew }: { guess: any, index: number, isWon: boolean, isNew: boolean }) => {
  const getColor = (val?: string) => {
    switch (val) {
      case 'MATCH':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PARTIAL':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'MISMATCH':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'HIGHER':
      case 'LOWER':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800/50 text-zinc-300 border-white/5';
    }
  };

  const getStyle = (delay: number) => isNew ? {
    animation: `answerDown 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
    animationDelay: `${delay}s`,
    opacity: 0
  } : { opacity: 1 };

  return (
    <div className="grid grid-cols-8 gap-2">
      <div className="flex justify-center items-center bg-zinc-800/80 backdrop-blur-md border border-white/5 rounded-xl p-2 w-[150px] shadow-sm" style={getStyle(0)}>
        <img src={getImageUrl(guess.champion.iconPath)} alt={guess.champion.name} className="w-14 h-14 object-cover rounded shadow-md border border-white/10" onError={(e) => (e.currentTarget.src = "/img/Red.png")} />
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-bold tracking-wide border text-center ${isWon && index === 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-300 border-white/5"}`} style={getStyle(0.1)}>
        {guess.champion.name}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-medium border text-center ${getColor(guess.comparison?.gender)}`} style={getStyle(0.2)}>
        {guess.champion.gender}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-medium border text-center ${getColor(guess.comparison?.role)}`} style={getStyle(0.3)}>
        {guess.champion.role}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-medium border text-center ${getColor(guess.comparison?.damageType)}`} style={getStyle(0.4)}>
        {guess.champion.damageType}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-medium border text-center ${getColor(guess.comparison?.resource)}`} style={getStyle(0.5)}>
        {guess.champion.resource}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-medium border text-center ${getColor(guess.comparison?.rangeType)}`} style={getStyle(0.6)}>
        {guess.champion.rangeType}
      </div>
      <div className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm font-bold border relative text-center ${getColor(guess.comparison?.yearRelease)}`} style={getStyle(0.7)}>
        {guess.champion.yearRelease}
        {guess.comparison?.yearRelease === 'HIGHER' && <span className="absolute right-4 font-black text-xl animate-bounce">↑</span>}
        {guess.comparison?.yearRelease === 'LOWER' && <span className="absolute right-4 font-black text-xl animate-bounce">↓</span>}
      </div>
    </div>
  );
};

export default function Home() {
  const {
    user,
    activeChallenge,
    championsList,
    classicProgress: progress,
    isSubmittingGuess,
    initializeSession,
    fetchInitialData,
    makeGuess,
    showVictoryModalMode,
    clearVictoryModal
  } = useGameStore();

  const [search, setSearch] = useState<ChampionEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showHint, setShowHint] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const domSearch = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which guesses have already been animated
  const animatedGuesses = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);

  // Prevent animation on initial load, only animate newly added guesses
  useEffect(() => {
    if (progress) {
      if (!initialLoadDone.current) {
        progress.guesses.forEach(g => animatedGuesses.current.add(g.champion.id));
        initialLoadDone.current = true;
      } else {
        // We add new guesses to the set so they don't animate again on next render
        progress.guesses.forEach(g => animatedGuesses.current.add(g.champion.id));
      }
    } else {
      initialLoadDone.current = false;
      animatedGuesses.current.clear();
    }
  }, [progress]);

  // Initialize Session and Game Data
  useEffect(() => {
    initializeSession().then(() => {
      fetchInitialData();
    });
  }, [initializeSession, fetchInitialData]);

  // Watch for win condition from store
  useEffect(() => {
    if (showVictoryModalMode === 'CLASSIC') {
      setShowModal(true);
      
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const particleCount = 150;
      
      confetti({
        ...defaults, particleCount,
        origin: { x: 0.2, y: 0.5 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: 0.8, y: 0.5 }
      });
      
      clearVictoryModal();
    }
  }, [showVictoryModalMode, clearVictoryModal]);

  // Handle Search Input
  const searchCharacter = (input: string) => {
    if (input !== "") {
      const data = championsList.filter((c) =>
        c.name.toLowerCase().startsWith(input.toLowerCase())
      );
      
      // Remove already guessed champions from search results
      const guessedIds = progress?.guesses.map(g => g.champion.id) || [];
      const filteredData = data
        .filter(c => !guessedIds.includes(c.id))
        .slice(0, 20); // Limit results to improve performance
      
      setSearch(filteredData);
    } else {
      setSearch([]);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      setSelectedIndex((prev) => Math.min(prev + 1, search.length - 1));
    } else if (event.key === "ArrowUp") {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < search.length) {
        selectAnswer(search[selectedIndex]);
      }
    }
  };

  const selectAnswer = async (champion: ChampionEntity) => {
    if (isSubmittingGuess || progress?.isWon) return;

    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearch([]);
    
    // Call API
    await makeGuess(champion.id);
  };

  // Reset arrow index when search changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  // Loading state
  if (!user || !activeChallenge || championsList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">Loading Game...</h1>
      </div>
    );
  }

  const targetChamp = progress?.isWon
    ? championsList.find(c => c.id === progress?.targetChampionId) ?? null
    : null;

  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-2 container mx-auto xl:pt-[100px] pt-[50px] select-none text-white z-10 relative">
        
        {/* search box container */}
        <div className="flex flex-col items-center container mx-auto bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-1/4 min-h-[300px] min-w-3/4 md:min-w-[500px] relative">
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="How to play"
          >
            ?
          </button>

          <h1 className="text-3xl md:text-4xl font-semibold mb-8 text-center tracking-wide">
            Poro Guess <span className="text-blue-400 font-light">Classic</span>
          </h1>

          <div className="w-[85%] md:w-3/4 flex flex-col items-center justify-center relative z-20">
            {progress?.isWon && targetChamp ? (
              <div className="w-full flex flex-col gap-2">
                <CountdownTimer className="text-zinc-400 text-sm mb-1" />
                <div 
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-300 rounded-xl cursor-pointer hover:bg-zinc-200 transition-colors shadow-sm text-black group animate-fade-in"
                >
                  <div className="flex items-center gap-4 font-bold text-lg">
                    <img
                      src={getImageUrl(targetChamp.iconPath)}
                      alt={targetChamp.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm border border-black/10"
                      onError={(e) => (e.currentTarget.src = "/img/Red.png")}
                    />
                    <span className="tracking-wide uppercase">{targetChamp.name}</span>
                  </div>
                  <div className="text-zinc-500 group-hover:text-zinc-800 transition-colors text-sm font-bold flex items-center gap-1">
                    <span>View Result</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                </div>
              </div>
            ) : (
              <input
                className="w-full bg-[#111620] border border-blue-500/30 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] placeholder-zinc-500 disabled:opacity-50"
                placeholder="Type a champion name..."
                onChange={(e) => searchCharacter(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                autoComplete="off"
                disabled={isSubmittingGuess}
              />
            )}

            {/* select dropdown */}
            <div
              ref={domSearch}
              className={`w-full md:w-3/4 max-h-[300px] overflow-y-auto flex flex-col border border-white/10 bg-zinc-900 rounded-xl absolute top-[60px] shadow-2xl z-50 ${inputRef.current?.value == "" || progress?.isWon ? "hidden" : "block"}`}
            >
              {search.length === 0 && inputRef.current?.value !== "" ? (
                <div className="flex items-center justify-center p-4 text-zinc-500 italic">
                  No champions found!
                </div>
              ) : (
                search.map((champion, index) => (
                  <div
                    key={champion.id}
                    className={`flex items-center gap-4 p-3 border-b border-white/5 transition-colors cursor-pointer ${selectedIndex === index ? "bg-blue-500/20 text-blue-100" : "hover:bg-white/5 text-zinc-300"}`}
                    onClick={() => selectAnswer(champion)}
                  >
                    <img
                      width={40}
                      height={40}
                      src={getImageUrl(champion.iconPath)}
                      alt={champion.name}
                      className="w-10 h-10 object-cover rounded shadow-md border border-white/10"
                      onError={(e) => (e.currentTarget.src = "/img/Red.png")}
                    />
                    <span className="font-medium text-lg">{champion.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Indicator Legend */}
          <div className="flex flex-col items-center mt-auto pt-6 w-full">
            <p className="text-zinc-400 text-sm tracking-widest uppercase mb-4 font-semibold">Indicators</p>
            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(225,39,41,0.6)] group-hover:scale-110 transition-transform"></div>
                <div className="text-xs text-zinc-400 font-medium">Wrong</div>
              </div>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(243,115,36,0.6)] group-hover:scale-110 transition-transform"></div>
                <div className="text-xs text-zinc-400 font-medium">Partial</div>
              </div>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(0,127,78,0.6)] group-hover:scale-110 transition-transform"></div>
                <div className="text-xs text-zinc-400 font-medium">Correct</div>
              </div>
            </div>
          </div>

          {/* Hint Section (Clues) */}
          <div className="flex justify-center gap-6 mt-8 mb-2">
            <div className="flex flex-col items-center gap-2">
              <button 
                className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${progress?.hint ? 'border-yellow-500 bg-[#1E293B]/80 hover:bg-zinc-800 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-105' : 'border-white/10 bg-black/40 opacity-50 cursor-not-allowed'}`}
                onClick={() => progress?.hint && setShowHint(!showHint)}
                disabled={!progress?.hint}
              >
                <span className="text-2xl">{progress?.hint ? '💡' : '🔒'}</span>
              </button>
              <div className="text-center">
                <p className="text-zinc-300 text-sm font-medium">Quote Clue</p>
                {progress?.hint ? (
                  <p className="text-yellow-500 text-xs font-bold cursor-pointer" onClick={() => setShowHint(!showHint)}>
                    {showHint ? 'Hide' : 'Click to View'}
                  </p>
                ) : (
                  <p className="text-zinc-500 text-xs">in {Math.max(0, 3 - (progress?.guesses.length || 0))} tries</p>
                )}
              </div>
            </div>
          </div>

          {/* The actual hint text when opened */}
          {showHint && progress?.hint && (
            <div className="mb-4 p-5 bg-[#1E293B]/90 backdrop-blur-md rounded-2xl border border-yellow-500/30 max-w-2xl text-center shadow-lg animate-fade-in-up w-full">
              <p className="text-zinc-300 leading-relaxed italic text-lg">"{progress.hint}"</p>
            </div>
          )}
        </div>

        {progress?.isWon && (
          <div className="mt-4 mb-4 bg-[#1E293B]/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg animate-fade-in">
            <p className="text-xl font-light tracking-wide text-zinc-300">
              Total Guesses <span className="font-bold text-blue-400">({progress?.guesses.length || 0})</span>
            </p>
          </div>
        )}
        <p className="md:hidden text-zinc-500 text-sm mb-4 bg-black/50 px-3 py-1 rounded-full mt-4">Swipe ➜ to see more</p>

        {/* Table Container */}
        <div className="flex flex-col items-center mt-4 pl-5 pr-5 w-full overflow-x-auto scrollbar-hidden">
          {/* Table Header */}
          <div className="w-[1256px] grid grid-cols-8 gap-2 bg-zinc-800/80 backdrop-blur-md text-zinc-400 font-bold uppercase tracking-wider rounded-xl mb-4 shadow-lg border border-white/5">
            <div className="flex justify-center items-center py-4 w-[150px]">Icon</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Name</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Gender</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Role</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Damage</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Resource</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Range</div>
            <div className="flex justify-center items-center py-4 w-[150px]">Year</div>
          </div>

          {/* guesses list */}
          <div className="w-[1256px] mb-20 flex flex-col gap-3">
            {!progress || progress.guesses.length === 0 ? (
              <div className="flex justify-center items-center bg-[#1E293B]/40 backdrop-blur-sm border border-white/10 rounded-xl p-8 w-full text-zinc-500 italic">
                Type your first guess above!
              </div>
            ) : (
              [...progress.guesses].reverse().map((guess, index) => {
                const isNewGuess = initialLoadDone.current && !animatedGuesses.current.has(guess.champion.id);
                return (
                  <GuessRow 
                    key={progress.guesses.length - index} 
                    guess={guess} 
                    index={index} 
                    isWon={!!progress.isWon} 
                    isNew={isNewGuess} 
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Victory Modal */}
        <VictoryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          isWon={!!progress?.isWon}
          targetChamp={targetChamp}
          progress={progress}
          mode="CLASSIC"
        />
        
        <TutorialModal 
          show={showTutorial} 
          onClose={() => setShowTutorial(false)}
          title="How to Play: Classic"
          content={
            <div className="space-y-4">
              <p>Guess the <strong className="text-white">League of Legends champion</strong> from today's challenge!</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Type a champion's name to make a guess.</li>
                <li>After each guess, the attributes will change color to show how close you are to the correct answer.</li>
              </ul>
              
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-500 flex-shrink-0"></div>
                  <span className="text-sm"><strong className="text-emerald-400">Green:</strong> Exact match.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-orange-400 flex-shrink-0"></div>
                  <span className="text-sm"><strong className="text-orange-300">Orange:</strong> Partial match (e.g., shares one role or region).</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-rose-500 flex-shrink-0"></div>
                  <span className="text-sm"><strong className="text-rose-400">Red:</strong> No match at all.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#111620] border border-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">↑/↓</span>
                  </div>
                  <span className="text-sm"><strong className="text-white">Arrows:</strong> Indicates if the correct year is higher or lower.</span>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Try to guess the champion in as few tries as possible!</p>
            </div>
          }
        />
      </main>
      <Footer />
    </>
  );
}
