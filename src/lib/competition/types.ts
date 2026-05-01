import type { MatchRules } from '@/lib/sim/types';

export type CompetitionFormat = 'league' | 'cup' | 'groups_knockout';
export type CompetitionStatus = 'setup' | 'ongoing' | 'completed';
export type CompMatchStatus = 'pending' | 'completed';

export type CompMatch = {
  id: string;
  homeTeamId: string | null;   // null = TBD (winner not yet known)
  awayTeamId: string | null;
  homeFromMatch?: string;       // match id whose winner fills this slot
  awayFromMatch?: string;
  round: number;
  phase: string;                // 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3rd' | 'league'
  groupId?: string;
  leg: 1 | 2;
  status: CompMatchStatus;
  result?: {
    home: number;
    away: number;
    penalties?: { home: number; away: number };
  };
  matchFileId?: string;
  simulatedAt?: string;
};

export type CompGroup = {
  id: string;
  name: string;
  teamIds: string[];
};

export type Standing = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type CompetitionConfig = {
  legsPerMatch: 1 | 2;
  thirdPlaceMatch: boolean;
  groupsCount?: number;
  qualifyPerGroup?: number;
  matchRules: MatchRules;
};

export type Competition = {
  id: string;
  name: string;
  format: CompetitionFormat;
  teamIds: string[];
  matches: CompMatch[];
  groups?: CompGroup[];
  standings: Record<string, Standing>;
  config: CompetitionConfig;
  currentRound: number;
  status: CompetitionStatus;
  createdAt: string;
  winner?: string;
};

export type CompetitionSummary = {
  id: string;
  name: string;
  format: CompetitionFormat;
  status: CompetitionStatus;
  teamCount: number;
  createdAt: string;
  winner?: string;
};

export const FORMAT_LABEL: Record<CompetitionFormat, string> = {
  league: 'Championnat (Ligue)',
  cup: 'Coupe (Élimination directe)',
  groups_knockout: 'Groupes + Phase finale',
};

export const FORMAT_DESCRIPTION: Record<CompetitionFormat, string> = {
  league: 'Toutes les équipes se rencontrent. Classement par points.',
  cup: 'Tirage au sort, élimination directe à chaque tour.',
  groups_knockout: 'Phase de groupes puis tableau final à élimination directe.',
};
