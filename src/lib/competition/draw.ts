import type { Team } from '@/lib/types';

export type Pot = {
  number: 1 | 2 | 3 | 4;
  teamIds: string[];
};

export type DrawResult = {
  pots: Pot[];
  /** ordered list of drawn teamIds (for animated reveal) */
  order: string[];
  /** groupId → teamIds assigned */
  groups: Record<string, string[]>;
};

/** Assign teams to up to 4 pots by globalStrength (descending). */
export function buildPots(teams: Team[]): Pot[] {
  const sorted = [...teams].sort((a, b) => b.globalStrength - a.globalStrength);
  const total = sorted.length;
  // distribute as evenly as possible across min(4, ...) pots
  const potCount = Math.min(4, total);
  const pots: Pot[] = Array.from({ length: potCount }, (_, i) => ({
    number: (i + 1) as 1 | 2 | 3 | 4,
    teamIds: [],
  }));

  sorted.forEach((team, i) => {
    const potIdx = Math.floor((i / total) * potCount);
    pots[Math.min(potIdx, potCount - 1)].teamIds.push(team.id);
  });

  return pots;
}

function rng<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw teams from pots into groups.
 * Rule: one team per pot per group (when possible).
 * Returns draw result with animated reveal order (pot 1 first, then 2...).
 */
export function conductDraw(pots: Pot[], groupCount: number): DrawResult {
  const shuffledPots = pots.map((p) => ({ ...p, teamIds: rng(p.teamIds) }));
  const groups: Record<string, string[]> = {};
  for (let g = 0; g < groupCount; g++) {
    groups[`group_${g}`] = [];
  }

  const order: string[] = [];

  for (const pot of shuffledPots) {
    const potTeams = [...pot.teamIds];
    // sort groups by current size asc so we fill evenly
    const groupKeys = Object.keys(groups).sort(
      (a, b) => groups[a].length - groups[b].length,
    );
    for (const gKey of groupKeys) {
      if (potTeams.length === 0) break;
      // pick random team from remaining pot
      const idx = Math.floor(Math.random() * potTeams.length);
      const [team] = potTeams.splice(idx, 1);
      groups[gKey].push(team);
      order.push(team);
    }
    // any leftover (uneven) go to groups with least teams
    for (const team of potTeams) {
      const gKey = Object.keys(groups).sort(
        (a, b) => groups[a].length - groups[b].length,
      )[0];
      groups[gKey].push(team);
      order.push(team);
    }
  }

  return { pots: shuffledPots, order, groups };
}

/** True if teamCount is even (required for group stage). */
export function isEvenTeamCount(count: number): boolean {
  return count % 2 === 0;
}

/**
 * Build pots for knockout draw from qualifier ranks.
 * Each pot = one rank: pot 1 = group winners, pot 2 = runners-up, etc.
 * The draw pairs them: winner of group A vs runner-up of another group, etc.
 */
export function buildKnockoutPots(qualifiersByRank: string[][]): Pot[] {
  return qualifiersByRank.slice(0, 4).map((teamIds, i) => ({
    number: (i + 1) as 1 | 2 | 3 | 4,
    teamIds,
  }));
}

/**
 * Draw for knockout: pair teams from pot 1 vs pot 2, etc.
 * Pot 1 teams are home, matched against shuffled pot 2 teams.
 * Returns order (animated) + pairs as "groups" with 2 teams each.
 */
export function conductKnockoutDraw(pots: Pot[]): DrawResult {
  if (pots.length < 2) {
    // Only one pot (e.g. qualifyPerGroup=1) — just shuffle and pair
    const shuffled = rng(pots[0]?.teamIds ?? []);
    const groups: Record<string, string[]> = {};
    const order: string[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const key = `match_${i / 2}`;
      groups[key] = [shuffled[i], shuffled[i + 1]].filter(Boolean);
      order.push(...groups[key]);
    }
    return { pots, order, groups };
  }

  // Pair pot 1 vs pot 2, pot 3 vs pot 4 (if exist)
  const result: DrawResult = { pots, order: [], groups: {} };
  const pot1 = rng(pots[0].teamIds);
  const pot2 = rng(pots[1].teamIds);

  // Pair each winner (pot1) with a runner-up (pot2) — no same-group constraint for now
  for (let i = 0; i < Math.min(pot1.length, pot2.length); i++) {
    const key = `ko_${i}`;
    result.groups[key] = [pot1[i], pot2[i]];
    result.order.push(pot1[i], pot2[i]);
  }

  // Additional pots (3, 4) if qualifyPerGroup > 2 — same pairing
  if (pots.length >= 4) {
    const pot3 = rng(pots[2].teamIds);
    const pot4 = rng(pots[3].teamIds);
    for (let i = 0; i < Math.min(pot3.length, pot4.length); i++) {
      const key = `ko_extra_${i}`;
      result.groups[key] = [pot3[i], pot4[i]];
      result.order.push(pot3[i], pot4[i]);
    }
  } else if (pots.length === 3) {
    const pot3 = rng(pots[2].teamIds);
    for (const t of pot3) {
      const key = `ko_3rd_${t}`;
      result.groups[key] = [t];
      result.order.push(t);
    }
  }

  return result;
}

export const POT_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: 'var(--accent)',
  2: '#e8c547',
  3: '#a78bfa',
  4: '#f87171',
};
