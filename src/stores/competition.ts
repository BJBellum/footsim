import { create } from 'zustand';
import type { Competition, CompetitionSummary } from '@/lib/competition/types';
import {
  listCompetitions,
  loadCompetition,
  saveCompetition,
  deleteCompetition,
} from '@/lib/github/competitions';

type State = {
  summaries: CompetitionSummary[];
  current: Competition | null;
  loading: boolean;
  refresh: (token: string) => Promise<void>;
  load: (id: string, token: string) => Promise<Competition | null>;
  save: (competition: Competition, token: string) => Promise<void>;
  remove: (id: string, token: string) => Promise<void>;
  setCurrent: (c: Competition | null) => void;
};

export const useCompetition = create<State>((set, get) => ({
  summaries: [],
  current: null,
  loading: false,

  async refresh(token) {
    set({ loading: true });
    try {
      const summaries = await listCompetitions(token);
      set({ summaries });
    } finally {
      set({ loading: false });
    }
  },

  async load(id, token) {
    const comp = await loadCompetition(id, token);
    set({ current: comp });
    return comp;
  },

  async save(competition, token) {
    await saveCompetition(competition, token);
    set({ current: competition });
    const summary: CompetitionSummary = {
      id: competition.id,
      name: competition.name,
      format: competition.format,
      status: competition.status,
      teamCount: competition.teamIds.length,
      createdAt: competition.createdAt,
      winner: competition.winner,
    };
    const list = get().summaries;
    const next = list.some((c) => c.id === competition.id)
      ? list.map((c) => (c.id === competition.id ? summary : c))
      : [summary, ...list];
    set({ summaries: next });
  },

  async remove(id, token) {
    await deleteCompetition(id, token);
    set({ summaries: get().summaries.filter((c) => c.id !== id) });
    if (get().current?.id === id) set({ current: null });
  },

  setCurrent(c) {
    set({ current: c });
  },
}));
