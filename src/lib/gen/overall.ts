import type { Player, Position, PlayerStats } from '@/lib/types';

type Weights = Record<string, number>;

const WEIGHTS: Record<Position, Weights> = {
  GK: { reflexes: 5, handling: 4, oneOnOne: 3, aerial: 3, kicking: 2, throwing: 2, anticipation: 2, decisions: 2, composure: 2, jumping: 2, agility: 2 },
  CB: { tackling: 4, marking: 4, heading: 3, strength: 3, jumping: 3, anticipation: 3, decisions: 3, composure: 2, pace: 2, passing: 1 },
  LB: { tackling: 3, marking: 2, crossing: 3, pace: 3, stamina: 3, anticipation: 2, decisions: 2, workRate: 2, dribbling: 1 },
  RB: { tackling: 3, marking: 2, crossing: 3, pace: 3, stamina: 3, anticipation: 2, decisions: 2, workRate: 2, dribbling: 1 },
  DM: { tackling: 4, marking: 3, decisions: 3, anticipation: 3, workRate: 3, passing: 2, composure: 2, stamina: 2 },
  CM: { passing: 4, vision: 3, decisions: 3, stamina: 2, dribbling: 1, tackling: 1, workRate: 2, firstTouch: 2 },
  AM: { vision: 4, dribbling: 3, longShots: 3, passing: 2, decisions: 2, composure: 2, firstTouch: 2 },
  LM: { crossing: 3, stamina: 3, pace: 2, passing: 2, dribbling: 2, workRate: 2 },
  RM: { crossing: 3, stamina: 3, pace: 2, passing: 2, dribbling: 2, workRate: 2 },
  LW: { pace: 4, dribbling: 4, crossing: 3, acceleration: 3, finishing: 2, agility: 2 },
  RW: { pace: 4, dribbling: 4, crossing: 3, acceleration: 3, finishing: 2, agility: 2 },
  ST: { finishing: 5, composure: 3, offTheBall: 3, heading: 2, pace: 2, dribbling: 1, strength: 2 },
};

function flatStats(s: PlayerStats): Record<string, number> {
  return {
    ...s.technical,
    ...s.mental,
    ...s.physical,
    ...(s.goalkeeping ?? {}),
  };
}

export function computeOverall(player: Pick<Player, 'position' | 'stats'>): number {
  const w = WEIGHTS[player.position];
  const flat = flatStats(player.stats);
  let sum = 0;
  let denom = 0;
  for (const [key, weight] of Object.entries(w)) {
    const v = flat[key];
    if (v == null) continue;
    sum += v * weight;
    denom += weight;
  }
  if (denom === 0) return 1;
  return Math.round((sum / denom) * 5);
}
