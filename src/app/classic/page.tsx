"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { ChampionEntity } from "../utils/api";
import { getImageUrl } from "../utils/image";

export default function Home() {
  const {
    user,
    activeChallenge,
    championsList,
    progress,
    isSubmittingGuess,
    initializeSession,
    fetchInitialData,
    makeGuess,
  } = useGameStore();

  const [search, setSearch] = useState<ChampionEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showHint, setShowHint] = useState(false);
  
  const domSearch = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Session and Game Data
  useEffect(() => {
    initializeSession().then(() => {
      fetchInitialData();
    });
  }, [initializeSession, fetchInitialData]);

  // Handle Search Input
  const searchCharacter = (input: string) => {
    if (input !== "") {
      const data = championsList.filter((c) =>
        c.name.toLowerCase().startsWith(input.toLowerCase())
      );
      
      // Remove already guessed champions from search results
      const guessedIds = progress?.guesses.map(g => g.champion.id) || [];
      const filteredData = data.filter(c => !guessedIds.includes(c.id));
      
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

  // Get Comparison Color (Premium Palette)
  const getColor = (result?: string) => {
    switch (result) {
      case 'MATCH':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; // Premium Green
      case 'PARTIAL':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'; // Premium Orange
      case 'MISMATCH':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'; // Premium Red
      case 'HIGHER':
      case 'LOWER':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800/50 text-zinc-300 border-white/5'; // Gray fallback
    }
  };

  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-2 container mx-auto xl:pt-[100px] pt-[50px] select-none text-white z-10 relative">
        
        {/* search box container */}
        <div className="flex flex-col items-center container mx-auto bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-1/4 min-h-[300px] min-w-3/4 md:min-w-[500px]">
          <h1 className="text-3xl md:text-4xl font-semibold mb-8 text-center tracking-wide">
            Poro Guess <span className="text-blue-400 font-light">Classic</span>
          </h1>

          <div className="flex flex-col items-center w-full relative">
            {/* search input */}
            <input
              type="text"
              name="search"
              id="search"
              className="bg-[#0B1121]/80 text-white placeholder-zinc-500 px-6 py-4 w-full md:w-3/4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50 border border-white/20 transition-all text-lg shadow-inner"
              placeholder={progress?.isWon ? "Game Over! You won." : "Type a champion name..."}
              onChange={(e) => searchCharacter(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              autoComplete="off"
              disabled={progress?.isWon || isSubmittingGuess}
            />

            {/* select dropdown */}
            <div
              ref={domSearch}
              className={`w-full md:w-3/4 max-h-[250px] overflow-y-auto flex flex-col border border-white/10 bg-zinc-900/95 backdrop-blur-xl rounded-xl absolute top-[60px] shadow-2xl z-50 ${inputRef.current?.value == "" || progress?.isWon ? "hidden" : "block"}`}
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
                // If it's the most recent guess (index === 0), run the reveal animation.
                // Otherwise, show it instantly without animation so old rows don't animate.
                const isNewGuess = index === 0 && !progress.isWon; // If won, we might want to skip or keep it
                // Actually, if we just use static classes for old rows, it's better. But since React might re-mount or we rely on index, we can just disable animation for index > 0.
                const animDuration = "0.6s";
                const getStyle = (delay: number) => index === 0 ? {
                  animation: `slideDown ${animDuration} cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                  animationDelay: `${delay}s`
                } : { opacity: 1 };
                
                const getOpacityClass = () => index === 0 ? "opacity-0" : "opacity-100";

                return (
                <div className="grid grid-cols-8 gap-2" key={progress.guesses.length - index}>
                  {/* Icon */}
                  <div
                    className={`flex justify-center items-center bg-zinc-800/80 backdrop-blur-md border border-white/5 rounded-xl p-2 w-[150px] shadow-sm slideDown ${getOpacityClass()}`}
                    style={getStyle(0)}
                  >
                    <img
                      src={getImageUrl(guess.champion.iconPath)}
                      alt={guess.champion.name}
                      className="w-14 h-14 object-cover rounded shadow-md border border-white/10"
                      onError={(e) => (e.currentTarget.src = "/img/Red.png")}
                    />
                  </div>

                  {/* Name */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-bold tracking-wide border transition-all text-center ${progress.isWon && index === 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-300 border-white/5"} ${getOpacityClass()}`}
                    style={getStyle(0.2)}
                  >
                    {guess.champion.name}
                  </div>

                  {/* Gender */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-medium border transition-all text-center ${getColor(guess.comparison?.gender)} ${getOpacityClass()}`}
                    style={getStyle(0.4)}
                  >
                    {guess.champion.gender}
                  </div>

                  {/* Role */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-medium border transition-all text-center ${getColor(guess.comparison?.role)} ${getOpacityClass()}`}
                    style={getStyle(0.6)}
                  >
                    {guess.champion.role}
                  </div>

                  {/* Damage Type */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-medium border transition-all text-center ${getColor(guess.comparison?.damageType)} ${getOpacityClass()}`}
                    style={getStyle(0.8)}
                  >
                    {guess.champion.damageType}
                  </div>

                  {/* Resource */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-medium border transition-all text-center ${getColor(guess.comparison?.resource)} ${getOpacityClass()}`}
                    style={getStyle(1.0)}
                  >
                    {guess.champion.resource}
                  </div>

                  {/* Range Type */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-medium border transition-all text-center ${getColor(guess.comparison?.rangeType)} ${getOpacityClass()}`}
                    style={getStyle(1.2)}
                  >
                    {guess.champion.rangeType}
                  </div>

                  {/* Year Release */}
                  <div
                    className={`flex justify-center items-center backdrop-blur-md rounded-xl p-3 w-[150px] shadow-sm slideDown font-bold border transition-all relative text-center ${getColor(guess.comparison?.yearRelease)} ${getOpacityClass()}`}
                    style={getStyle(1.4)}
                  >
                    {guess.champion.yearRelease}
                    {guess.comparison?.yearRelease === 'HIGHER' && <span className="absolute right-4 font-black text-xl animate-bounce">↑</span>}
                    {guess.comparison?.yearRelease === 'LOWER' && <span className="absolute right-4 font-black text-xl animate-bounce">↓</span>}
                  </div>

                </div>
              )})
            )}
          </div>
        </div>

        {/* Victory Modal */}
        {progress?.isWon && (
          <>
            {/* Backdrop Blur Overlay */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
            
            <div
              className="w-[90%] md:w-1/3 min-h-[300px] fixed top-[20%] flex flex-col items-center justify-center bg-[#1E293B]/90 backdrop-blur-xl border border-emerald-500/30 rounded-3xl z-50 opacity-0 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
              style={{
                animation: "answerDown 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
                animationDelay: "0.5s",
              }}
            >
              <div className="flex flex-col items-center p-10 rounded-xl text-center relative overflow-hidden w-full">
                {/* Background glow behind image */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />
                
                <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 mb-8 drop-shadow-sm tracking-wide z-10">
                  Victory!
                </h2>
                
                {/* Show the target champion */}
                <div className="relative z-10">
                  <img 
                    src={getImageUrl(progress.guesses[progress.guesses.length - 1].champion.iconPath)} 
                    alt="Target Champion" 
                    className="w-28 h-28 rounded-2xl shadow-2xl border-2 border-emerald-500/50 object-cover"
                    onError={(e) => (e.currentTarget.src = "/img/Green.png")}
                  />
                </div>
                
                <p className="mt-6 text-3xl font-bold tracking-wide z-10">
                  {progress.guesses[progress.guesses.length - 1].champion.name}
                </p>
                <p className="mt-3 text-emerald-400 font-medium bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20 z-10">
                  Solved in {progress.guesses.length} guesses
                </p>
                
                <p className="mt-10 text-zinc-400 text-sm font-medium z-10">
                  Come back tomorrow for a new challenge!
                </p>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
