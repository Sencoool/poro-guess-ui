import axios from 'axios';

// Create a configured axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally, you can add interceptors here later if you need to attach JWT tokens to every request
// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// Unwrap NestJS ResponseInterceptor payload
api.interceptors.response.use((response) => {
  if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
    response.data = response.data.data;
  }
  return response;
});

// --- Types ---
export interface ChampionEntity {
  id: number;
  name: string;
  gender: string;
  role: string;
  damageType: string;
  resource: string;
  rangeType: string;
  yearRelease: number;
  traits: string[];
  iconPath: string;
  splashPath: string[];
}

export interface DailyChallengeResponse {
  id: number;
  mode: string;
  imagePath?: string;
  matcherChampions?: number[];
}

export interface ChampionGuessResult {
  champion: ChampionEntity;
  comparison?: {
    gender: 'MATCH' | 'PARTIAL' | 'MISMATCH';
    role: 'MATCH' | 'PARTIAL' | 'MISMATCH';
    damageType: 'MATCH' | 'PARTIAL' | 'MISMATCH';
    resource: 'MATCH' | 'PARTIAL' | 'MISMATCH';
    rangeType: 'MATCH' | 'PARTIAL' | 'MISMATCH';
    yearRelease: 'MATCH' | 'HIGHER' | 'LOWER';
    traits: 'MATCH' | 'PARTIAL' | 'MISMATCH';
  };
}

export interface UserProgressResponse {
  id: number;
  userId: string;
  dailyChallengeId: number;
  guesses: ChampionGuessResult[];
  isWon: boolean;
  moves?: number;
  timeElapsed?: number;
  hint?: string;
  traits?: string[];
  targetChampionId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  score: number;
  rank: string;
  streak: number;
  isGuest: boolean;
}

// --- API Services ---

export const UserService = {
  createGuest: async (): Promise<UserProfileResponse> => {
    const response = await api.post('/users/guest');
    return response.data;
  },
  getUser: async (id: string): Promise<UserProfileResponse> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
};

export const ChampionService = {
  getAll: async (): Promise<ChampionEntity[]> => {
    const response = await api.get('/champions');
    return response.data;
  },
};

export const DailyChallengeService = {
  getAll: async (): Promise<DailyChallengeResponse[]> => {
    const response = await api.get('/daily-challenges');
    return response.data;
  },
};

export const UserProgressService = {
  getProgress: async (userId: string, dailyChallengeId: number): Promise<UserProgressResponse> => {
    const response = await api.get(`/user-progress/${userId}/${dailyChallengeId}`);
    return response.data;
  },
  makeGuess: async (userId: string, dailyChallengeId: number, championId: number): Promise<UserProgressResponse> => {
    const response = await api.post(`/user-progress/${userId}/${dailyChallengeId}/guess`, {
      championId,
    });
    return response.data;
  },
};
