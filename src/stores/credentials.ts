import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  githubPat: string | null;
  setPat: (pat: string | null) => void;
};

export const useCredentials = create<State>()(
  persist(
    (set) => ({
      githubPat: null,
      setPat: (githubPat) => set({ githubPat }),
    }),
    { name: 'footsim.github_pat' },
  ),
);
