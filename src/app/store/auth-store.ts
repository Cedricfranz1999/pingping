import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId: number;
  username: string;
  role: 'admin' | 'employee';
  firstName?: string;
  lastName?: string;
  canModify?:boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (userData: User) => set({ 
        user: userData, 
        isAuthenticated: true 
      }),
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);