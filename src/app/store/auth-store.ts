import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  userId: number;
  username: string;
  role: "admin" | "employee" | "user";
  firstName?: string;
  lastName?: string;
  canModify?: boolean;
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
      login: (userData: User) =>
        set({
          user: userData,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      // ✅ Correctly typed storage function
      storage:
        typeof window !== "undefined"
          ? {
              getItem: (name) => {
                const value = window.localStorage.getItem(name);
                return value ? JSON.parse(value) : null;
              },
              setItem: (name, value) => {
                window.localStorage.setItem(name, JSON.stringify(value));
              },
              removeItem: (name) => {
                window.localStorage.removeItem(name);
              },
            }
          : undefined,
    },
  ),
);
