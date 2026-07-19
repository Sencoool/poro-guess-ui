import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';

interface TraitsState {
  // challengeId -> state
  games: Record<number, {
    revealedTraits: number[];
    availableUnlocks: number;
    score: number;
    isGivenUp: boolean;
  }>;
  initGame: (challengeId: number) => void;
  revealTrait: (challengeId: number, traitIndex: number) => void;
  addUnlock: (challengeId: number) => void;
  giveUp: (challengeId: number) => void;
}

export const useTraitsStore = create<TraitsState>()(
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
                revealedTraits: [],
                availableUnlocks: 1, // Start with 1 free unlock
                score: 12, // Start with 12 score
                isGivenUp: false,
              },
            },
          });
        }
      },
      revealTrait: (challengeId, traitIndex) => {
        const state = get().games[challengeId];
        if (!state) return;
        if (state.revealedTraits.includes(traitIndex)) return;
        if (state.availableUnlocks <= 0) return;

        set({
          games: {
            ...get().games,
            [challengeId]: {
              ...state,
              revealedTraits: [...state.revealedTraits, traitIndex],
              availableUnlocks: state.availableUnlocks - 1,
            },
          },
        });
      },
      addUnlock: (challengeId) => {
        const state = get().games[challengeId];
        if (!state) return;
        
        const newScore = Math.max(0, state.score - 3);
        
        if (state.revealedTraits.length + state.availableUnlocks < 5) {
          set({
            games: {
              ...get().games,
              [challengeId]: {
                ...state,
                availableUnlocks: state.availableUnlocks + 1,
                score: newScore,
              },
            },
          });
        } else {
          set({
            games: {
              ...get().games,
              [challengeId]: {
                ...state,
                score: newScore,
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
        useGameStore.getState().triggerVictoryModal('TRAITS');
      }
    }),
    {
      name: 'poro-guess-traits-storage',
    }
  )
);
