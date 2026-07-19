"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { useJigsawStore } from "../store/useJigsawStore";
import { ChampionEntity } from "../utils/api";
import { getImageUrl } from "../utils/image";
import confetti from "canvas-confetti";
import VictoryModal from "../components/VictoryModal";
import TutorialModal from "../components/TutorialModal";
import CountdownTimer from "../components/CountdownTimer";

export default function Jigsaw() {
  const {
    user,
    jigsawChallenge,
    activeChallenge,
    championsList,
    jigsawProgress: progress,
    isSubmittingGuess,
    initializeSession,
    fetchInitialData,
    setActiveMode,
    makeGuess,
    showVictoryModalMode,
    clearVictoryModal
  } = useGameStore();

  const { games, initGame, revealTile, addUnlock, giveUp } = useJigsawStore();

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
        setActiveMode('JIGSAW');
      });
    });
  }, [initializeSession, fetchInitialData, setActiveMode]);

  useEffect(() => {
    if (jigsawChallenge) {
      initGame(jigsawChallenge.id);
    }
  }, [jigsawChallenge, initGame]);

  const gameState = jigsawChallenge ? games[jigsawChallenge.id] : null;

  // Watch for win condition from store
  useEffect(() => {
    if (showVictoryModalMode === 'JIGSAW') {
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
      
      const guessedIds = progress?.guesses.map(g => g.champion.id) || [];
      const filteredData = data
        .filter(c => !guessedIds.includes(c.id))
        .slice(0, 20); // Limit results to improve performance
      
      setSearch(filteredData);
    } else {
      setSearch([]);
    }
  };

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
    
    await makeGuess(champion.id, { score: gameState?.score ?? 10 });
    
    // Add unlock if wrong
    const newProgress = useGameStore.getState().jigsawProgress; // get updated progress
    if (newProgress && !newProgress.isWon && jigsawChallenge) {
      addUnlock(jigsawChallenge.id);
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !user || !activeChallenge || !jigsawChallenge || championsList.length === 0 || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">Loading Game...</h1>
      </div>
    );
  }

  // Jigsaw Grid setup
  const totalTiles = 16;
  
  const targetChamp = progress?.isWon || gameState.isGivenUp
    ? championsList.find(c => c.id === progress?.targetChampionId) ?? null
    : null;
  
  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-2 container mx-auto xl:pt-[100px] pt-[50px] select-none text-white z-10 relative">
        
        <div className="flex flex-col items-center container mx-auto bg-[#1E293B]/95 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-1/4 md:min-w-[600px] lg:min-w-[800px] relative">
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="How to play"
          >
            ?
          </button>

          <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-center tracking-wide">
            Poro Guess <span className="text-blue-400 font-light">Jigsaw</span>
          </h1>
          
          <div className="flex justify-between w-full mb-6 px-2">
            <div className="text-zinc-400 font-medium text-sm">
              Score: <span className="text-yellow-500 font-bold ml-1">{gameState.score}</span>
            </div>
            <div className="text-zinc-400 font-medium text-sm">
              Available Unlocks: <span className="text-emerald-500 font-bold ml-1">{gameState.availableUnlocks}</span>
            </div>
          </div>

          {/* Jigsaw Board */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-white/10 mb-8 bg-zinc-900">
            {/* The actual image */}
            {jigsawChallenge.imagePath && (
              <img 
                src={getImageUrl(jigsawChallenge.imagePath)} 
                alt="Splash" 
                className="absolute inset-0 w-full h-full object-cover" 
              />
            )}
            
            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 w-full h-full">
              {Array.from({ length: totalTiles }).map((_, idx) => {
                const isRevealed = gameState.revealedTiles.includes(idx) || progress?.isWon;
                const canClick = !isRevealed && gameState.availableUnlocks > 0 && !progress?.isWon;
                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (canClick) revealTile(jigsawChallenge.id, idx);
                    }}
                    className={`border border-white/5 transition-all duration-300 ${isRevealed ? 'opacity-0' : 'bg-[#0f172a] opacity-100'} ${canClick ? 'cursor-pointer hover:bg-[#1e293b]' : 'cursor-default'}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center w-full relative mb-4">
            {/* Input Area or Answer Card */}
            {(progress?.isWon || gameState.isGivenUp) && targetChamp ? (
              <div className="w-full md:w-3/4 flex flex-col gap-2">
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
                type="text"
                name="search"
                id="search"
                className="bg-[#0B1121]/80 text-white placeholder-zinc-500 px-6 py-4 w-full md:w-3/4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50 border border-white/20 transition-all text-lg shadow-inner"
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
              className={`w-full md:w-3/4 max-h-[250px] overflow-y-auto flex flex-col border border-white/10 bg-zinc-900 rounded-xl absolute bottom-[70px] shadow-2xl z-50 ${inputRef.current?.value == "" || progress?.isWon ? "hidden" : "block"}`}
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
          
          {gameState.score === 0 && !progress?.isWon && !gameState.isGivenUp && (
            <button
              onClick={() => giveUp(jigsawChallenge.id)}
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

        {/* Victory Modal */}
        <VictoryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          isWon={!!progress?.isWon}
          targetChamp={targetChamp}
          progress={progress}
          mode="JIGSAW"
          jigsawScore={gameState?.score ?? 10}
        />

        <TutorialModal 
          show={showTutorial} 
          onClose={() => setShowTutorial(false)}
          title="How to Play: Jigsaw"
          content={
            <div className="space-y-4">
              <p>Guess the champion based on a <strong className="text-white">fragment of their Splash Art</strong>!</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You start with one random piece of the puzzle revealed.</li>
                <li>Each wrong guess grants you an <strong className="text-emerald-400">Available Unlock</strong>.</li>
                <li>Tap any covered tile to spend an unlock and reveal that part of the image.</li>
                <li>Type a champion's name in the search box to make a guess.</li>
              </ul>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mt-4">
                <h3 className="font-bold text-white mb-2">Scoring</h3>
                <ul className="space-y-2 text-sm">
                  <li>Start with <strong className="text-yellow-400">100 points</strong>.</li>
                  <li>Each wrong guess or tile revealed deducts <strong className="text-rose-400">10 points</strong>.</li>
                  <li>Minimum score you can get is <strong className="text-yellow-400">10 points</strong>.</li>
                </ul>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Try to guess correctly using as few pieces as possible to maximize your score!</p>
            </div>
          }
        />
      </main>
      <Footer />
    </>
  );
}
