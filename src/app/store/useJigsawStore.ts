import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JigsawState {
  // challengeId -> state
  games: Record<number, {
    revealedTiles: number[];
    availableUnlocks: number;
    score: number;
    isGivenUp: boolean;
  }>;
  initGame: (challengeId: number) => void;
  revealTile: (challengeId: number, tileIndex: number) => void;
  addUnlock: (challengeId: number) => void;
  giveUp: (challengeId: number) => void;
}

export const useJigsawStore = create<JigsawState>()(
  persist(
    (set, get) => ({
      games: {},
      initGame: (challengeId) => {
        const { games } = get();
        if (!games[challengeId]) {
          set({
            games: {
              ...games,
              [challengeId]: {
                revealedTiles: [],
                availableUnlocks: 1, // Start with 1 unlock manually clicked by user
                score: 10,
                isGivenUp: false,
              },
            },
          });
        }
      },
      revealTile: (challengeId, tileIndex) => {
        const state = get().games[challengeId];
        if (!state) return;
        if (state.revealedTiles.includes(tileIndex)) return;
        if (state.availableUnlocks <= 0) return;

        // If it's the very first tile, score stays 10. Otherwise, reduce by 2.
        const newScore = state.revealedTiles.length === 0 ? 10 : Math.max(0, state.score - 2);
        
        set({
          games: {
            ...get().games,
            [challengeId]: {
              ...state,
              revealedTiles: [...state.revealedTiles, tileIndex],
              availableUnlocks: state.availableUnlocks - 1,
              score: newScore,
            },
          },
        });
      },
      addUnlock: (challengeId) => {
        const state = get().games[challengeId];
        if (!state) return;
        // Max 5 extra clicks (so total 6 tiles max).
        // Since first click is free, there are 5 wrong guesses max.
        // Each wrong guess adds 1 unlock. But if they already opened 6 tiles, no more unlocks.
        if (state.revealedTiles.length + state.availableUnlocks < 6) {
          set({
            games: {
              ...get().games,
              [challengeId]: {
                ...state,
                availableUnlocks: state.availableUnlocks + 1,
              },
            },
          });
        }
      },
      giveUp: (challengeId) => {
        const state = get().games[challengeId];
        if (!state) return;
        set({
          games: {
            ...get().games,
            [challengeId]: {
              ...state,
              isGivenUp: true,
            },
          },
        });
      }
    }),
    {
      name: 'poro-guess-jigsaw-storage',
    }
  )
);
