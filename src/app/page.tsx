"use client";

import Link from "next/link";
import Header from "./components/header";
import Footer from "./components/footer";

const GAME_MODES = [
  {
    id: "classic",
    title: "Classic",
    href: "/classic",
    disabled: false,
  },
  {
    id: "jigsaw",
    title: "Splash Jigsaw",
    href: "#",
    disabled: true,
  },
  {
    id: "traits",
    title: "Traits",
    href: "#",
    disabled: true,
  },
  {
    id: "matcher",
    title: "Skin Matcher",
    href: "#",
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center p-6 z-10">
        
        {/* Central Dark Container */}
        <div className="bg-[#1E293B]/95 backdrop-blur-md rounded-3xl p-10 md:p-14 shadow-2xl flex flex-col items-center min-w-[300px] sm:min-w-[400px] md:min-w-[500px]">
          
          <h1 className="text-4xl md:text-5xl font-medium tracking-wide mb-10 text-center">
            PoroGuess
          </h1>

          <div className="flex flex-col gap-6 w-full max-w-sm">
            {GAME_MODES.map((mode) => {
              const CardWrapper = mode.disabled ? "div" : Link;
              return (
                <CardWrapper
                  key={mode.id}
                  href={mode.disabled ? "#" : mode.href}
                  className={`w-full py-4 text-center text-xl md:text-2xl font-medium shadow-md transition-all duration-300 ${
                    mode.disabled 
                      ? "bg-gradient-to-r from-blue-900 to-blue-800 text-blue-300 opacity-60 cursor-not-allowed" 
                      : "bg-gradient-to-r from-[#4CA1F0] to-[#3B82F6] hover:from-[#5BB0FF] hover:to-[#4C93F7] hover:scale-105 cursor-pointer text-white"
                  }`}
                >
                  {mode.title}
                </CardWrapper>
              );
            })}
            
            <Link
              href="/leaderboard"
              className="w-full py-4 text-center text-xl md:text-2xl font-medium shadow-md transition-all duration-300 bg-gradient-to-r from-[#4CA1F0] to-[#3B82F6] hover:from-[#5BB0FF] hover:to-[#4C93F7] hover:scale-105 cursor-pointer text-white mt-2"
            >
              Leaderboard
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
