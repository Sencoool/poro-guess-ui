"use client";

import Link from "next/link";
import Header from "./components/header";
import Footer from "./components/footer";
import Image from "next/image";

const GAME_MODES = [
  {
    id: "classic",
    title: "Classic",
    desc: "Guess the champion from their stats & attributes.",
    href: "/classic",
    disabled: false,
    icon: "🧩",
    gradient: "from-emerald-500/20",
    border: "border-zinc-800 hover:border-emerald-500/30",
    titleColor: "text-zinc-100 group-hover:text-emerald-400"
  },
  {
    id: "jigsaw",
    title: "Splash Jigsaw",
    desc: "Reveal the puzzle pieces of champion splash arts.",
    href: "/jigsaw",
    disabled: false,
    icon: "🖼️",
    gradient: "from-purple-500/20",
    border: "border-zinc-800 hover:border-purple-500/30",
    titleColor: "text-zinc-100 group-hover:text-purple-400"
  },
  {
    id: "traits",
    title: "Traits",
    desc: "Identify champions by their unique abilities.",
    href: "/traits",
    disabled: false,
    icon: "🔮",
    gradient: "from-orange-500/20",
    border: "border-zinc-800 hover:border-orange-500/30",
    titleColor: "text-zinc-100 group-hover:text-orange-400"
  },
  {
    id: "matcher",
    title: "Icon Matcher",
    desc: "Test your memory in this fast-paced card matching game.",
    href: "/matcher",
    disabled: false,
    icon: "🃏",
    gradient: "from-cyan-500/20",
    border: "border-zinc-800 hover:border-cyan-500/30",
    titleColor: "text-zinc-100 group-hover:text-cyan-400"
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 z-10 w-full relative">
        {/* Central Container */}
        <div className="w-full max-w-4xl flex flex-col items-center bg-[#111827]/80 rounded-[2.5rem] p-6 sm:p-12 shadow-2xl border border-white/5">
          
          {/* Logo / Header */}
          <div className="mb-10 sm:mb-14 text-center animate-fade-in flex flex-col items-center" style={{ animation: "slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] group">
              <Image 
                src="/img/logo.png?v=2" 
                alt="Poro Guess Logo" 
                fill 
                className="object-cover rounded-full border border-white/20 shadow-xl transition-transform duration-500 group-hover:scale-105" 
                priority 
                unoptimized 
              />
            </div>
            <p className="text-zinc-400 font-medium tracking-widest text-sm uppercase">
              The Ultimate League of Legends Trivia
            </p>
          </div>

          {/* Game Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full mb-8 z-10 relative">
            {GAME_MODES.map((mode, index) => {
              const CardWrapper = mode.disabled ? "div" : Link;
              return (
                <CardWrapper
                  key={mode.id}
                  href={mode.disabled ? "#" : mode.href}
                  className={`
                    relative group rounded-3xl p-6 sm:p-8 transition duration-300 ease-out border transform-gpu
                    flex flex-col items-start gap-4 h-full
                    ${mode.disabled 
                      ? "bg-zinc-900/50 border-zinc-800 opacity-50 cursor-not-allowed" 
                      : `bg-[#0d1524]/80 ${mode.border} cursor-pointer hover:-translate-y-1`}
                  `}
                  style={{ 
                    animation: `answerDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                    willChange: "transform, opacity, border-color"
                  }}
                >
                  {/* Inset Gradient Hover Reveal */}
                  {!mode.disabled && (
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mode.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                  )}

                  {/* Icon Frame */}
                  <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 relative z-10 transform-gpu`}>
                    {mode.icon}
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h2 className={`text-2xl font-bold tracking-wide mb-2 transition-colors ${mode.disabled ? "text-zinc-500" : mode.titleColor}`}>
                      {mode.title}
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed transition-colors group-hover:text-zinc-300">
                      {mode.desc}
                    </p>
                  </div>
                  
                  {/* Disabled Overlay */}
                  {mode.disabled && (
                    <div className="absolute top-4 right-4 bg-zinc-800 text-zinc-500 text-[10px] font-bold px-2 py-1 rounded-md border border-zinc-700 z-10">
                      COMING SOON
                    </div>
                  )}
                </CardWrapper>
              );
            })}
          </div>
          
          {/* Leaderboard Banner */}
          <div 
            className="w-full mt-2 relative z-10"
            style={{ 
              animation: `answerDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `0.4s`,
              opacity: 0
            }}
          >
            <Link
              href="/leaderboard"
              className="relative w-full flex items-center justify-between p-6 rounded-3xl group cursor-pointer border border-zinc-800 hover:border-blue-500/30 transition duration-300 hover:-translate-y-1 bg-[#0d1524]/80 transform-gpu"
              style={{ willChange: "transform, border-color" }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 group-hover:border-blue-500/30 transform-gpu">
                  🏆
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-wide text-zinc-100 group-hover:text-blue-400 transition-colors">
                    Global Leaderboard
                  </h3>
                  <p className="text-zinc-500 text-sm font-medium tracking-wider uppercase">
                    View Top 500 Players
                  </p>
                </div>
              </div>

              <div className="relative z-10 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all duration-300 transform-gpu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
