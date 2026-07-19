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
  traitsChallenge: DailyChallengeResponse | null;
  activeChallenge: DailyChallengeResponse | null;
  championsList: ChampionEntity[];
  isLoadingData: boolean;
  
  // Progress state
  classicProgress: UserProgressResponse | null;
  jigsawProgress: UserProgressResponse | null;
  traitsProgress: UserProgressResponse | null;
  isSubmittingGuess: boolean;
  
  // Modal trigger state
  showVictoryModalMode: 'CLASSIC' | 'JIGSAW' | 'TRAITS' | 'MATCHER' | null;
  triggerVictoryModal: (mode: 'CLASSIC' | 'JIGSAW' | 'TRAITS' | 'MATCHER') => void;
  clearVictoryModal: () => void;
  
  // Actions
  initializeSession: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  setActiveMode: (mode: 'CLASSIC' | 'JIGSAW' | 'TRAITS') => Promise<void>;
  loadProgress: () => Promise<void>;
  makeGuess: (championId?: number, options?: { moves?: number; timeElapsed?: number; isWon?: boolean; score?: number }) => Promise<void>;
  refreshUser: () => Promise<void>;
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
      traitsChallenge: null,
      activeChallenge: null,
      championsList: [],
      isLoadingData: false,
      
      classicProgress: null,
      jigsawProgress: null,
      traitsProgress: null,
      isSubmittingGuess: false,
      
      showVictoryModalMode: null,
      triggerVictoryModal: (mode) => set({ showVictoryModalMode: mode }),
      clearVictoryModal: () => set({ showVictoryModalMode: null }),
      
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
          const traitsChallenge = challenges.find(c => c.mode === 'TRAITS') || null;
          
          set({ 
            classicChallenge,
            jigsawChallenge,
            traitsChallenge,
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
      setActiveMode: async (mode: 'CLASSIC' | 'JIGSAW' | 'TRAITS') => {
        const { classicChallenge, jigsawChallenge, traitsChallenge, activeChallenge } = get();
        const nextChallenge = mode === 'CLASSIC' ? classicChallenge : mode === 'JIGSAW' ? jigsawChallenge : traitsChallenge;
        
        if (nextChallenge && nextChallenge.id !== activeChallenge?.id) {
          set({ activeChallenge: nextChallenge });
          // Load progress for new active challenge
          await get().loadProgress();
        }
      },
      
      // Load progress for active challenge
      loadProgress: async () => {
        const { user, activeChallenge } = get();
        if (!user || !activeChallenge) return;
        
        const isClassic = activeChallenge.mode === 'CLASSIC';
        const isJigsaw = activeChallenge.mode === 'JIGSAW';
        
        try {
          const progress = await UserProgressService.getProgress(user.id, activeChallenge.id);
          // Prevent race condition: only update if activeChallenge hasn't changed during fetch
          if (get().activeChallenge?.id === activeChallenge.id) {
            if (isClassic) set({ classicProgress: progress });
            else if (isJigsaw) set({ jigsawProgress: progress });
            else set({ traitsProgress: progress });
          }
        } catch (e: any) {
          // Prevent race condition
          if (get().activeChallenge?.id !== activeChallenge.id) return;
          
          if (e.response?.status === 404) {
            // No progress yet, this is fine
            if (isClassic) set({ classicProgress: null });
            else if (isJigsaw) set({ jigsawProgress: null });
            else set({ traitsProgress: null });
          } else {
            console.error('Failed to load progress:', e);
          }
        }
      },
      
      // Make a guess
      makeGuess: async (championId?: number, options?: { moves?: number; timeElapsed?: number; isWon?: boolean; score?: number }) => {
        const { user, activeChallenge, classicProgress, jigsawProgress, traitsProgress } = get();
        if (!user || !activeChallenge) return;
        
        const isClassic = activeChallenge.mode === 'CLASSIC';
        const isJigsaw = activeChallenge.mode === 'JIGSAW';
        const currentProgress = isClassic ? classicProgress : isJigsaw ? jigsawProgress : traitsProgress;
        
        if (currentProgress?.isWon) return; // Already won
        
        try {
          set({ isSubmittingGuess: true });
          const newProgress = await UserProgressService.makeGuess(user.id, activeChallenge.id, championId, options);
          if (isClassic) set({ classicProgress: newProgress, isSubmittingGuess: false });
          else if (isJigsaw) set({ jigsawProgress: newProgress, isSubmittingGuess: false });
          else set({ traitsProgress: newProgress, isSubmittingGuess: false });
          
          if (newProgress.isWon && !currentProgress?.isWon) {
             set({ showVictoryModalMode: activeChallenge.mode });
          }
        } catch (e) {
          console.error('Failed to submit guess:', e);
          set({ isSubmittingGuess: false });
        }
      },
      
      refreshUser: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const freshUser = await UserService.getUser(user.id);
          set({ user: freshUser });
        } catch (e) {
          console.error('Failed to refresh user:', e);
        }
      },

      resetProgress: () => set({ classicProgress: null, jigsawProgress: null, traitsProgress: null }),
    }),
    {
      name: 'poro-guess-storage',
      // Only persist the user object to localStorage so we don't lose the guest ID!
      partialize: (state) => ({ user: state.user }),
    }
  )
);
