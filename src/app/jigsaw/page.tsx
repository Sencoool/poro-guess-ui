"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import { useGameStore } from "../store/useGameStore";
import { useJigsawStore } from "../store/useJigsawStore";
import { ChampionEntity } from "../utils/api";
import { getImageUrl } from "../utils/image";

export default function Jigsaw() {
  const {
    user,
    jigsawChallenge,
    activeChallenge,
    championsList,
    progress,
    isSubmittingGuess,
    initializeSession,
    fetchInitialData,
    setActiveMode,
    makeGuess,
  } = useGameStore();

  const { games, initGame, revealTile, addUnlock, giveUp } = useJigsawStore();

  const [search, setSearch] = useState<ChampionEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
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

  // Handle Search Input
  const searchCharacter = (input: string) => {
    if (input !== "") {
      const data = championsList.filter((c) =>
        c.name.toLowerCase().startsWith(input.toLowerCase())
      );
      
      const guessedIds = progress?.guesses.map(g => g.champion.id) || [];
      const filteredData = data.filter(c => !guessedIds.includes(c.id));
      
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
    
    await makeGuess(champion.id);
    
    // Add unlock if wrong
    const newProgress = useGameStore.getState().progress; // get updated progress
    if (newProgress && !newProgress.isWon && jigsawChallenge) {
      addUnlock(jigsawChallenge.id);
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  if (!user || !activeChallenge || !jigsawChallenge || championsList.length === 0 || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">Loading Game...</h1>
      </div>
    );
  }

  // Jigsaw Grid setup
  const totalTiles = 16;
  
  return (
    <>
      <Header />
      <main className="flex flex-col items-center flex-grow py-2 container mx-auto xl:pt-[100px] pt-[50px] select-none text-white z-10 relative">
        
        <div className="flex flex-col items-center container mx-auto bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-1/4 md:min-w-[600px] lg:min-w-[800px]">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-center tracking-wide">
            Poro Guess <span className="text-blue-400 font-light">Jigsaw</span>
          </h1>
          
          <div className="flex justify-between w-full mb-6 px-4">
            <div className="text-zinc-300 font-medium">
              Score: <span className="text-yellow-400 font-bold text-xl">{gameState.score}</span>
            </div>
            <div className="text-zinc-300 font-medium">
              Available Unlocks: <span className="text-emerald-400 font-bold text-xl">{gameState.availableUnlocks}</span>
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
                    className={`border border-white/5 transition-all duration-300 ${isRevealed ? 'opacity-0' : 'bg-[#0f172a] opacity-100'} ${canClick ? 'cursor-pointer hover:bg-[#1e293b]/90' : 'cursor-default'}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center w-full relative mb-4">
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
          
          {gameState.score === 0 && !progress?.isWon && !gameState.isGivenUp && (
            <button
              onClick={() => giveUp(jigsawChallenge.id)}
              className="mt-2 text-rose-400 hover:text-rose-300 transition-colors font-medium text-sm underline"
            >
              Give Up
            </button>
          )}

          {gameState.isGivenUp && !progress?.isWon && (
            <div className="mt-4 text-rose-500 font-bold text-xl">
              You gave up! Keep guessing to see the answer.
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[80%]">
            {progress?.guesses.map((guess, idx) => (
              <div key={idx} className="bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-sm font-medium animate-fade-in">
                {guess.champion.name}
              </div>
            ))}
          </div>

        </div>

        {/* Victory Modal */}
        {progress?.isWon && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
            
            <div
              className="w-[90%] md:w-1/3 min-h-[300px] fixed top-[20%] flex flex-col items-center justify-center bg-[#1E293B]/90 backdrop-blur-xl border border-emerald-500/30 rounded-3xl z-50 opacity-0 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
              style={{
                animation: "answerDown 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
                animationDelay: "0.2s",
              }}
            >
              <div className="flex flex-col items-center p-10 rounded-xl text-center relative overflow-hidden w-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />
                
                <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 mb-8 drop-shadow-sm tracking-wide z-10">
                  Victory!
                </h2>
                
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
                <p className="mt-2 text-yellow-400 font-bold bg-yellow-500/10 px-4 py-1 rounded-full border border-yellow-500/20 z-10">
                  Score: {gameState.score}
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
