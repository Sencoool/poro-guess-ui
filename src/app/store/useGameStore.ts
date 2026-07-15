import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserProfileResponse,
  DailyChallengeResponse,
  UserProgressResponse,
  ChampionEntity,
  UserService,
  DailyChallengeService,
  ChampionService,
  UserProgressService
} from '../utils/api';

interface GameState {
  // Auth / User state
  user: UserProfileResponse | null;
  isLoadingUser: boolean;
  
  // Game data state
  classicChallenge: DailyChallengeResponse | null;
  jigsawChallenge: DailyChallengeResponse | null;
  activeChallenge: DailyChallengeResponse | null;
  championsList: ChampionEntity[];
  isLoadingData: boolean;
  
  // Progress state
  progress: UserProgressResponse | null;
  isSubmittingGuess: boolean;
  
  // Actions
  initializeSession: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  setActiveMode: (mode: 'CLASSIC' | 'JIGSAW') => Promise<void>;
  loadProgress: () => Promise<void>;
  makeGuess: (championId: number) => Promise<void>;
  resetProgress: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoadingUser: false,
      
      classicChallenge: null,
      jigsawChallenge: null,
      activeChallenge: null,
      championsList: [],
      isLoadingData: false,
      
      progress: null,
      isSubmittingGuess: false,
      
      // Initialize User Session
      initializeSession: async () => {
        const { user } = get();
        if (user) {
          // Verify user exists or refresh profile
          try {
            set({ isLoadingUser: true });
            const freshUser = await UserService.getUser(user.id);
            set({ user: freshUser, isLoadingUser: false });
            return;
          } catch (e) {
            console.error('Failed to load existing user, creating new guest...', e);
          }
        }
        
        // Create new guest
        try {
          set({ isLoadingUser: true });
          const newGuest = await UserService.createGuest();
          set({ user: newGuest, isLoadingUser: false });
        } catch (e) {
          console.error('Error creating guest user:', e);
          set({ isLoadingUser: false });
        }
      },
      
      // Fetch initial game data (Challenges and Champions)
      fetchInitialData: async () => {
        try {
          set({ isLoadingData: true });
          const [challenges, champions] = await Promise.all([
            DailyChallengeService.getAll(),
            ChampionService.getAll()
          ]);
          
          const classicChallenge = challenges.find(c => c.mode === 'CLASSIC') || null;
          const jigsawChallenge = challenges.find(c => c.mode === 'JIGSAW') || null;
          
          set({ 
            classicChallenge,
            jigsawChallenge,
            // default to classic, or can be set by the page
            activeChallenge: get().activeChallenge || classicChallenge,
            championsList: champions,
            isLoadingData: false 
          });
          
          // Automatically load progress if we have user and challenge
          const { user, activeChallenge } = get();
          if (user && activeChallenge) {
            get().loadProgress();
          }
        } catch (e) {
          console.error('Failed to fetch initial game data:', e);
          set({ isLoadingData: false });
        }
      },
      
      // Set active mode
      setActiveMode: async (mode: 'CLASSIC' | 'JIGSAW') => {
        const { classicChallenge, jigsawChallenge, activeChallenge } = get();
        const nextChallenge = mode === 'CLASSIC' ? classicChallenge : jigsawChallenge;
        
        if (nextChallenge && nextChallenge.id !== activeChallenge?.id) {
          set({ activeChallenge: nextChallenge, progress: null });
          // Load progress for new active challenge
          await get().loadProgress();
        }
      },
      
      // Load progress for active challenge
      loadProgress: async () => {
        const { user, activeChallenge } = get();
        if (!user || !activeChallenge) return;
        
        try {
          const progress = await UserProgressService.getProgress(user.id, activeChallenge.id);
          set({ progress });
        } catch (e: any) {
          if (e.response?.status === 404) {
            // No progress yet, this is fine
            set({ progress: null });
          } else {
            console.error('Failed to load progress:', e);
          }
        }
      },
      
      // Make a guess
      makeGuess: async (championId: number) => {
        const { user, activeChallenge, progress } = get();
        if (!user || !activeChallenge) return;
        if (progress?.isWon) return; // Already won
        
        try {
          set({ isSubmittingGuess: true });
          const newProgress = await UserProgressService.makeGuess(user.id, activeChallenge.id, championId);
          set({ progress: newProgress, isSubmittingGuess: false });
        } catch (e) {
          console.error('Failed to submit guess:', e);
          set({ isSubmittingGuess: false });
        }
      },
      
      resetProgress: () => set({ progress: null }),
    }),
    {
      name: 'poro-guess-storage',
      // Only persist the user object to localStorage so we don't lose the guest ID!
      partialize: (state) => ({ user: state.user }),
    }
  )
);
