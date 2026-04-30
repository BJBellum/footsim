import type { Position } from '@/lib/types';

const DIST: Array<[Position, number]> = [
  ['GK', 8],
  ['CB', 18], ['LB', 7], ['RB', 7],
  ['DM', 8], ['CM', 14], ['AM', 6], ['LM', 3], ['RM', 4],
  ['LW', 6], ['RW', 6], ['ST', 13],
];

export function distributePositions(total: number): Position[] {
  const out: Position[] = [];
  for (const [pos, share] of DIST) {
    const n = Math.round((share / 100) * total);
    for (let i = 0; i < n; i++) out.push(pos);
  }
  while (out.length < total) out.push('CM');
  while (out.length > total) out.pop();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type StatKey =
  | 'technical.passing' | 'technical.crossing' | 'technical.dribbling'
  | 'technical.finishing' | 'technical.firstTouch' | 'technical.heading'
  | 'technical.longShots' | 'technical.tackling' | 'technical.marking'
  | 'mental.vision' | 'mental.decisions' | 'mental.composure' | 'mental.anticipation'
  | 'mental.offTheBall' | 'mental.aggression' | 'mental.workRate'
  | 'physical.pace' | 'physical.acceleration' | 'physical.strength' | 'physical.stamina'
  | 'physical.agility' | 'physical.balance' | 'physical.jumping'
  | 'goalkeeping.reflexes' | 'goalkeeping.handling' | 'goalkeeping.aerial'
  | 'goalkeeping.oneOnOne' | 'goalkeeping.kicking' | 'goalkeeping.throwing';

export const POSITION_BOOSTS: Record<Position, Partial<Record<StatKey, number>>> = {
  GK: {
    'goalkeeping.reflexes': 5, 'goalkeeping.handling': 5, 'goalkeeping.aerial': 4,
    'goalkeeping.oneOnOne': 4, 'goalkeeping.kicking': 3, 'goalkeeping.throwing': 3,
    'technical.passing': -2, 'technical.finishing': -3,
  },
  CB: {
    'technical.tackling': 4, 'technical.marking': 4, 'technical.heading': 3,
    'physical.strength': 3, 'physical.jumping': 3,
    'physical.pace': -1, 'technical.dribbling': -1,
  },
  LB: {
    'technical.tackling': 3, 'technical.marking': 2,
    'physical.pace': 3, 'physical.stamina': 3, 'technical.crossing': 2,
  },
  RB: {
    'technical.tackling': 3, 'technical.marking': 2,
    'physical.pace': 3, 'physical.stamina': 3, 'technical.crossing': 2,
  },
  DM: {
    'technical.tackling': 3, 'technical.marking': 2,
    'mental.decisions': 2, 'mental.anticipation': 2, 'mental.workRate': 2,
  },
  CM: {
    'technical.passing': 3, 'mental.vision': 3,
    'mental.decisions': 2, 'physical.stamina': 2,
  },
  AM: {
    'mental.vision': 3, 'technical.dribbling': 3,
    'technical.longShots': 2, 'mental.decisions': 2,
  },
  LM: {
    'physical.stamina': 2, 'technical.crossing': 3,
    'physical.pace': 2, 'technical.passing': 2,
  },
  RM: {
    'physical.stamina': 2, 'technical.crossing': 3,
    'physical.pace': 2, 'technical.passing': 2,
  },
  LW: {
    'physical.pace': 4, 'technical.dribbling': 3,
    'technical.crossing': 3, 'physical.acceleration': 3,
  },
  RW: {
    'physical.pace': 4, 'technical.dribbling': 3,
    'technical.crossing': 3, 'physical.acceleration': 3,
  },
  ST: {
    'technical.finishing': 5, 'mental.composure': 3,
    'mental.offTheBall': 3, 'technical.heading': 2,
  },
};
