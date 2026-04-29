import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/lib/auth/discord';
import { isAdminId } from '@/lib/auth/discord';

type State = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  isLoggedIn: () => boolean;
  isAdmin: () => boolean;
  isExpired: () => boolean;
  logout: () => void;
};

export const useSession = create<State>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      isLoggedIn: () => {
        const s = get().session;
        return Boolean(s) && !get().isExpired();
      },
      isAdmin: () => {
        const s = get().session;
        return Boolean(s) && !get().isExpired() && isAdminId(s!.id);
      },
      isExpired: () => {
        const s = get().session;
        if (!s) return true;
        return Date.now() >= s.expiresAt;
      },
      logout: () => set({ session: null }),
    }),
    { name: 'footsim.session' },
  ),
);
