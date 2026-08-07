import { create } from 'zustand';
import type { AuthSession, AuthUser } from '@/types/auth';
import { getMe } from '@/services/auth.api';
import { clearTokens, getAccessToken, saveTokens } from '@/services/tokenStorage';

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isProfileComplete: boolean;
  setAuth: (session: AuthSession) => Promise<void>;
  completeProfile: (name: string) => void;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isProfileComplete: false,

  async setAuth(session) {
    await saveTokens(session.accessToken, session.refreshToken);
    set({
      user: session.user,
      isAuthenticated: true,
      isInitializing: false,
      isProfileComplete:
        !session.requiresProfileSetup && session.user.name.trim().length > 0,
    });
  },

  completeProfile(name) {
    set((state) => ({
      user: state.user ? { ...state.user, name } : state.user,
      isProfileComplete: true,
    }));
  },

  async restoreSession() {
    set({ isInitializing: true });

    try {
      const token = await getAccessToken();

      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          isInitializing: false,
          isProfileComplete: false,
        });
        return;
      }

      const response = await getMe();

      set({
        user: response.data,
        isAuthenticated: true,
        isInitializing: false,
        isProfileComplete: response.data.name.trim().length > 0,
      });
    } catch {
      await clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        isProfileComplete: false,
      });
    }
  },

  async logout() {
    await clearTokens();
    set({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      isProfileComplete: false,
    });
  },
}));
