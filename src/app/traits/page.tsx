"use client";

import { useState, useRef, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import { useTraitsStore } from "../store/useTraitsStore";
import { ChampionEntity } from "../utils/api";
import Header from "../components/header";
import { getImageUrl } from "../utils/image";
import confetti from 'canvas-confetti';
import VictoryModal from "../components/VictoryModal";
import TutorialModal from "../components/TutorialModal";
import CountdownTimer from "../components/CountdownTimer";
import Footer from "../components/footer";

export default function TraitsPage() {
  const {
    user,
    traitsChallenge,
    activeChallenge,
    championsList,
    traitsProgress: progress,
    isSubmittingGuess,
    initializeSession,
    fetchInitialData,
    setActiveMode,
    makeGuess,
    showVictoryModalMode,
    clearVictoryModal
  } = useGameStore();

  const {
    games,
    initGame,
    revealTrait,
    addUnlock,
    giveUp
  } = useTraitsStore();

  const [search, setSearch] = useState<ChampionEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showModal, setShowModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const domSearch = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Session and Game Data
  useEffect(() => {
    initializeSession().then(() => {
      fetchInitialData().then(() => {
        setActiveMode('TRAITS');
      });
    });
  }, [initializeSession, fetchInitialData, setActiveMode]);

  // Init Game State when challenge is loaded
  useEffect(() => {
    if (traitsChallenge) {
      initGame(traitsChallenge.id);
    }
  }, [traitsChallenge, initGame]);

  const gameState = traitsChallenge ? games[traitsChallenge.id] : null;

  // Watch for win condition from store
  useEffect(() => {
    if (showVictoryModalMode === 'TRAITS') {
      setShowModal(true);
      
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const particleCount = 150;
      
      // Fire once on left and right instead of a 3-second interval loop
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
      
      const guessedIds = progress?.guesses.map(g => g.champion.id) || [];
      const filteredData = data
        .filter(c => !guessedIds.includes(c.id))
        .slice(0, 20); // Limit results
      
      setSearch(filteredData);
      setSelectedIndex(-1);
    } else {
      setSearch([]);
    }
  };

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (search.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < search.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < search.length) {
          submitGuess(search[selectedIndex]);
        } else {
          submitGuess(search[0]);
        }
      }
    }
  };

  // Submit Guess
  const submitGuess = async (champion: ChampionEntity) => {
    if (isSubmittingGuess || progress?.isWon || gameState?.isGivenUp) return;

    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSearch([]);
    
    await makeGuess(champion.id, { score: gameState?.score });
    
    // Add unlock if wrong
    const newProgress = useGameStore.getState().traitsProgress;
    if (newProgress && !newProgress.isWon && traitsChallenge) {
      addUnlock(traitsChallenge.id);
    }
  };

  // Reset arrow index when search changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  // Loading state
  if (!user || !activeChallenge || !traitsChallenge || championsList.length === 0 || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111827] text-white">
        <h1 className="text-2xl font-bold animate-pulse">Loading Game...</h1>
      </div>
    );
  }

  const targetChamp = progress?.isWon || gameState.isGivenUp
    ? championsList.find(c => c.id === progress?.targetChampionId) ?? null
    : null;

  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-2 container mx-auto xl:pt-[80px] pt-[30px] select-none text-white z-10 relative">
        
        {/* Main Card */}
        <div className="flex flex-col items-center w-full bg-[#1c2331] border border-white/5 p-6 md:p-10 rounded-3xl shadow-2xl max-w-[95%] md:w-[600px] relative">
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="How to play"
          >
            ?
          </button>

          <h1 className="text-2xl font-medium mb-6 text-center text-zinc-200 tracking-wide">
            Traits game
          </h1>
          
          <div className="flex justify-between w-full mb-6 px-2">
            <div className="text-zinc-400 font-medium text-sm">
              Score: <span className="text-yellow-500 font-bold ml-1">{gameState.score}</span>
            </div>
            <div className="text-zinc-400 font-medium text-sm">
              Available Unlocks: <span className="text-emerald-500 font-bold ml-1">{gameState.availableUnlocks}</span>
            </div>
          </div>

          {/* Traits Blocks */}
          <div className="w-full flex flex-col gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, idx) => {
              const isRevealed = gameState.revealedTraits.includes(idx) || progress?.isWon || gameState.isGivenUp;
              const traitText = traitsChallenge?.traits?.[idx] || "Hidden Trait";
              const canClick = !isRevealed && gameState.availableUnlocks > 0 && !progress?.isWon && !gameState.isGivenUp;
              
              return (
                  <div 
                  key={idx}
                  onClick={() => {
                    if (canClick) revealTrait(traitsChallenge.id, idx);
                  }}
                  className={`relative w-full min-h-[55px] p-3 flex items-center justify-center transition-all duration-300 rounded-md overflow-hidden ${
                    isRevealed 
                      ? 'bg-zinc-200 text-black font-medium text-center text-sm md:text-base shadow-sm' 
                      : canClick
                        ? 'bg-[#2a364a] border border-yellow-500/50 cursor-pointer shadow-[0_0_10px_rgba(234,179,8,0.2)] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:bg-[#324056] group'
                        : 'bg-zinc-800/50 border border-white/5 cursor-default'
                  }`}
                >
                  {/* If it can be clicked but not revealed, show the pulsating background and icon */}
                  {canClick && !isRevealed && (
                    <>
                      <div className="absolute inset-0 bg-yellow-500/10 animate-pulse pointer-events-none" />
                      <div className="flex items-center gap-2 text-yellow-500/80 group-hover:text-yellow-400 transition-colors z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <span className="text-xs font-semibold tracking-wider uppercase">Click to Reveal</span>
                      </div>
                    </>
                  )}

                  {/* If locked (cannot be clicked and not revealed) */}
                  {!canClick && !isRevealed && (
                    <div className="flex items-center gap-2 text-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span className="text-xs font-semibold tracking-wider uppercase">Locked</span>
                    </div>
                  )}

                  {isRevealed ? <span className="z-10 relative">{traitText}</span> : ''}
                </div>
              );
            })}
          </div>

          {/* Input Area or Answer Card */}
          <div className="flex flex-col items-center w-full relative mb-2">
            {(progress?.isWon || gameState.isGivenUp) && targetChamp ? (
              <div className="w-full flex flex-col gap-2">
                <CountdownTimer className="text-zinc-400 text-sm mb-1" />
                <div 
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-200 transition-colors shadow-sm text-black group animate-fade-in"
                >
                  <div className="flex items-center gap-4 font-bold text-lg">
                    <img
                      src={getImageUrl(targetChamp.iconPath)}
                      alt={targetChamp.name}
                      className="w-10 h-10 rounded-full object-cover shadow-sm border border-black/10"
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
              <div className="flex items-center w-full gap-4 px-2">
                <div className="text-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  onChange={(e) => searchCharacter(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type champion name..."
                  disabled={isSubmittingGuess}
                  className="w-full bg-[#111620] border border-yellow-600/30 text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500/50 disabled:opacity-50"
                />
                <button 
                  onClick={() => search.length > 0 && submitGuess(selectedIndex >= 0 ? search[selectedIndex] : search[0])}
                  disabled={isSubmittingGuess || search.length === 0}
                  className="w-12 h-12 flex items-center justify-center bg-[#111620] border border-yellow-600/50 rounded-full hover:bg-yellow-600/20 transition-colors disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            )}

            {/* Dropdown Results */}
            {search.length > 0 && (
              <div
                ref={domSearch}
                className={`w-full max-h-[250px] overflow-y-auto flex flex-col border border-white/10 bg-zinc-900 rounded-xl absolute bottom-[70px] shadow-2xl z-50 ${inputRef.current?.value == "" || progress?.isWon || gameState.isGivenUp ? "hidden" : "block"}`}
              >
                {search.map((c, index) => (
                  <div
                    key={index}
                    onClick={() => submitGuess(c)}
                    className={`flex items-center gap-4 p-3 hover:bg-zinc-800 cursor-pointer border-b border-white/5 transition-colors ${
                      index === selectedIndex ? "bg-zinc-800" : ""
                    }`}
                  >
                    <img src={getImageUrl(c.iconPath)} alt={c.name} className="w-10 h-10 object-cover rounded-md" />
                    <span className="font-medium text-lg">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Give Up Button */}
          {!progress?.isWon && !gameState.isGivenUp && gameState.score === 0 && (
            <button 
              onClick={() => giveUp(traitsChallenge.id)}
              className="mt-4 px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Give Up (Show Answer)
            </button>
          )}

          {gameState.isGivenUp && !progress?.isWon && (
            <div className="mt-4 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm font-medium">
              You gave up! The answer is revealed above.
            </div>
          )}

          {/* Past Answers */}
          {progress && progress.guesses.length > 0 && (
            <div className="mt-6 flex flex-col items-center w-full max-w-[90%]">
              <p className="text-zinc-400 text-sm font-medium mb-3 uppercase tracking-wider">Recent Guesses</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[...progress.guesses].reverse().map((guess, idx) => {
                  const isCorrect = guess.champion.id === progress.targetChampionId;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 pr-3 pl-1 py-1 rounded-full text-sm font-medium animate-fade-in shadow-sm border ${
                        isCorrect 
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <img
                        src={getImageUrl(guess.champion.iconPath)}
                        alt={guess.champion.name}
                        className={`w-7 h-7 rounded-full object-cover border ${
                          isCorrect ? 'border-emerald-500/50' : 'border-rose-500/30'
                        }`}
                        onError={(e) => (e.currentTarget.src = "/img/Red.png")}
                      />
                      <span>{guess.champion.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>


        {/* Victory/Defeat Modal */}
        <VictoryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          isWon={!!progress?.isWon}
          targetChamp={targetChamp}
          progress={progress}
          mode="TRAITS"
          traitsScore={gameState?.score}
        />

        <TutorialModal 
          show={showTutorial} 
          onClose={() => setShowTutorial(false)}
          title="How to Play: Traits"
          content={
            <div className="space-y-4">
              <p>Guess the champion based on their <strong className="text-white">quotes and lore traits</strong>!</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You start with one hint revealed.</li>
                <li>Each wrong guess grants you an <strong className="text-emerald-400">Available Unlock</strong>.</li>
                <li>Tap any covered trait block to spend an unlock and reveal another hint.</li>
                <li>Type a champion's name in the search box to make a guess.</li>
              </ul>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mt-4">
                <h3 className="font-bold text-white mb-2">Scoring</h3>
                <ul className="space-y-2 text-sm">
                  <li>Start with <strong className="text-yellow-400">100 points</strong>.</li>
                  <li>Each wrong guess or trait revealed deducts <strong className="text-rose-400">10 points</strong>.</li>
                  <li>Minimum score you can get is <strong className="text-yellow-400">10 points</strong>.</li>
                </ul>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Try to guess correctly using as few hints as possible to maximize your score!</p>
            </div>
          }
        />

      </main>
      <Footer />
    </>
  );
}
