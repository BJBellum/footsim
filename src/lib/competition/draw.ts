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

export const POT_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: 'var(--accent)',
  2: '#e8c547',
  3: '#a78bfa',
  4: '#f87171',
};
