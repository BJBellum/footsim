import type { CompMatch, CompGroup, Standing } from './types';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Berger round-robin algorithm
// Returns rounds of [homeIdx, awayIdx] pairs
function roundRobin(n: number): [number, number][][] {
  const ghost = n % 2 !== 0 ? n : -1;
  const count = n % 2 === 0 ? n : n + 1;
  const teams = Array.from({ length: count }, (_, i) => i);
  const rounds: [number, number][][] = [];

  for (let r = 0; r < count - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < count / 2; i++) {
      const h = teams[i];
      const a = teams[count - 1 - i];
      if (h !== ghost && a !== ghost) {
        round.push([h, a]);
      }
    }
    rounds.push(round);
    // rotate all except index 0
    teams.splice(1, 0, teams.pop()!);
  }
  return rounds;
}

export function generateLeagueMatches(teamIds: string[], legs: 1 | 2): CompMatch[] {
  const rounds = roundRobin(teamIds.length);
  const matches: CompMatch[] = [];

  rounds.forEach((round, ri) => {
    round.forEach(([hi, ai]) => {
      matches.push({
        id: makeId(),
        homeTeamId: teamIds[hi],
        awayTeamId: teamIds[ai],
        round: ri + 1,
        phase: 'league',
        leg: 1,
        status: 'pending',
      });
    });
  });

  if (legs === 2) {
    const firstLegCount = rounds.length;
    rounds.forEach((round, ri) => {
      round.forEach(([hi, ai]) => {
        matches.push({
          id: makeId(),
          homeTeamId: teamIds[ai],
          awayTeamId: teamIds[hi],
          round: firstLegCount + ri + 1,
          phase: 'league',
          leg: 2,
          status: 'pending',
        });
      });
    });
  }

  return matches;
}

function bracketPhaseName(matchesInRound: number): string {
  if (matchesInRound === 1) return 'F';
  if (matchesInRound === 2) return 'SF';
  if (matchesInRound === 4) return 'QF';
  if (matchesInRound === 8) return 'R16';
  if (matchesInRound === 16) return 'R32';
  return `R${matchesInRound * 2}`;
}

export function generateCupBracket(
  teamIds: string[],
  legs: 1 | 2,
  thirdPlace: boolean,
  roundOffset = 1,
): CompMatch[] {
  const shuffled = shuffle(teamIds);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(shuffled.length, 2))));
  const padded: (string | null)[] = [...shuffled];
  while (padded.length < bracketSize) padded.push(null); // byes

  const matches: CompMatch[] = [];
  // slot[i] holds the id of the match whose winner fills bracket position i
  let roundTeams: (string | null)[] = [...padded];
  let round = roundOffset;

  while (roundTeams.filter((t) => t !== null).length > 1) {
    const nextSlots: (string | null)[] = [];
    const phase = bracketPhaseName(roundTeams.filter((t) => t !== null).length / 2);

    for (let i = 0; i < roundTeams.length; i += 2) {
      const a = roundTeams[i];
      const b = roundTeams[i + 1];

      if (a === null && b === null) { nextSlots.push(null); continue; }

      // Bye: one team advances directly
      if (a === null) { nextSlots.push(b); continue; }
      if (b === null) { nextSlots.push(a); continue; }

      const matchId = makeId();

      matches.push({
        id: matchId,
        homeTeamId: a.startsWith('winner:') ? null : a,
        awayTeamId: b.startsWith('winner:') ? null : b,
        homeFromMatch: a.startsWith('winner:') ? a.slice(7) : undefined,
        awayFromMatch: b.startsWith('winner:') ? b.slice(7) : undefined,
        round,
        phase,
        leg: 1,
        status: 'pending',
      });

      if (legs === 2 && phase !== 'F') {
        const retId = makeId();
        matches.push({
          id: retId,
          homeTeamId: b.startsWith('winner:') ? null : b,
          awayTeamId: a.startsWith('winner:') ? null : a,
          homeFromMatch: b.startsWith('winner:') ? b.slice(7) : undefined,
          awayFromMatch: a.startsWith('winner:') ? a.slice(7) : undefined,
          round,
          phase,
          leg: 2,
          status: 'pending',
        });
      }

      nextSlots.push(`winner:${matchId}`);
    }

    roundTeams = nextSlots;
    round++;
  }

  if (thirdPlace) {
    // Find the two SF match ids
    const sfMatches = matches.filter((m) => m.phase === 'SF' && m.leg === 1);
    if (sfMatches.length === 2) {
      matches.push({
        id: makeId(),
        homeTeamId: null,
        awayTeamId: null,
        homeFromMatch: sfMatches[0].id,
        awayFromMatch: sfMatches[1].id,
        round: round - 1,
        phase: '3rd',
        leg: 1,
        status: 'pending',
      });
    }
  }

  return matches;
}

export function generateGroupsKnockout(
  teamIds: string[],
  groupsCount: number,
  qualifyPerGroup: number,
  legs: 1 | 2,
  thirdPlace: boolean,
): { matches: CompMatch[]; groups: CompGroup[] } {
  const shuffled = shuffle(teamIds);
  const groups: CompGroup[] = [];

  for (let g = 0; g < groupsCount; g++) {
    const start = Math.floor((g / groupsCount) * shuffled.length);
    const end = Math.floor(((g + 1) / groupsCount) * shuffled.length);
    groups.push({
      id: `group_${g}`,
      name: `Groupe ${String.fromCharCode(65 + g)}`,
      teamIds: shuffled.slice(start, end),
    });
  }

  const allGroupMatches: CompMatch[] = [];
  let maxGroupRound = 0;

  for (const group of groups) {
    const rounds = roundRobin(group.teamIds.length);
    maxGroupRound = Math.max(maxGroupRound, rounds.length);
    rounds.forEach((round, ri) => {
      round.forEach(([hi, ai]) => {
        allGroupMatches.push({
          id: makeId(),
          homeTeamId: group.teamIds[hi],
          awayTeamId: group.teamIds[ai],
          round: ri + 1,
          phase: 'group',
          groupId: group.id,
          leg: 1,
          status: 'pending',
        });
      });
    });
  }

  // Generate knockout bracket slots (teams TBD — filled after group stage)
  const qualifiedCount = groupsCount * qualifyPerGroup;
  const qualifiedPlaceholders = Array.from({ length: qualifiedCount }, (_, i) => `qualified:${i}`);
  const knockoutMatches = generateCupBracket(qualifiedPlaceholders, legs, thirdPlace, maxGroupRound + 1).map((m) => ({
    ...m,
    homeTeamId: m.homeTeamId?.startsWith('qualified:') ? null : m.homeTeamId,
    awayTeamId: m.awayTeamId?.startsWith('qualified:') ? null : m.awayTeamId,
  }));

  return { matches: [...allGroupMatches, ...knockoutMatches], groups };
}

/** Like generateGroupsKnockout but accepts pre-drawn groups. */
export function generateGroupsKnockoutFromGroups(
  groups: CompGroup[],
  qualifyPerGroup: number,
  legs: 1 | 2,
  thirdPlace: boolean,
): { matches: CompMatch[]; groups: CompGroup[] } {
  const allGroupMatches: CompMatch[] = [];
  let maxGroupRound = 0;

  for (const group of groups) {
    const rounds = roundRobin(group.teamIds.length);
    maxGroupRound = Math.max(maxGroupRound, rounds.length);
    rounds.forEach((round, ri) => {
      round.forEach(([hi, ai]) => {
        allGroupMatches.push({
          id: makeId(),
          homeTeamId: group.teamIds[hi],
          awayTeamId: group.teamIds[ai],
          round: ri + 1,
          phase: 'group',
          groupId: group.id,
          leg: 1,
          status: 'pending',
        });
      });
    });
  }

  const qualifiedCount = groups.length * qualifyPerGroup;
  const qualifiedPlaceholders = Array.from({ length: qualifiedCount }, (_, i) => `qualified:${i}`);
  const knockoutMatches = generateCupBracket(qualifiedPlaceholders, legs, thirdPlace, maxGroupRound + 1).map((m) => ({
    ...m,
    homeTeamId: m.homeTeamId?.startsWith('qualified:') ? null : m.homeTeamId,
    awayTeamId: m.awayTeamId?.startsWith('qualified:') ? null : m.awayTeamId,
  }));

  return { matches: [...allGroupMatches, ...knockoutMatches], groups };
}

export function buildInitialStandings(teamIds: string[]): Record<string, Standing> {
  const s: Record<string, Standing> = {};
  for (const id of teamIds) {
    s[id] = { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  }
  return s;
}

export function applyResultToStandings(
  standings: Record<string, Standing>,
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
): Record<string, Standing> {
  const s = { ...standings };
  s[homeId] = { ...s[homeId] };
  s[awayId] = { ...s[awayId] };

  s[homeId].played++;
  s[awayId].played++;
  s[homeId].goalsFor += homeGoals;
  s[homeId].goalsAgainst += awayGoals;
  s[awayId].goalsFor += awayGoals;
  s[awayId].goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    s[homeId].won++;
    s[homeId].points += 3;
    s[awayId].lost++;
  } else if (homeGoals < awayGoals) {
    s[awayId].won++;
    s[awayId].points += 3;
    s[homeId].lost++;
  } else {
    s[homeId].drawn++;
    s[awayId].drawn++;
    s[homeId].points++;
    s[awayId].points++;
  }

  return s;
}

export function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// Advance bracket: given a completed match, fill winner into dependent matches
export function advanceBracket(matches: CompMatch[], completedMatchId: string): CompMatch[] {
  const done = matches.find((m) => m.id === completedMatchId);
  if (!done?.result || done.homeTeamId === null || done.awayTeamId === null) return matches;

  const winnerId = done.result.home > done.result.away
    ? done.homeTeamId
    : done.result.away > done.result.home
    ? done.awayTeamId
    : done.result.penalties
    ? (done.result.penalties.home > done.result.penalties.away ? done.homeTeamId : done.awayTeamId)
    : done.homeTeamId; // tie without penalties shouldn't happen in knockout

  const loserId = winnerId === done.homeTeamId ? done.awayTeamId : done.homeTeamId;

  return matches.map((m) => {
    let updated = { ...m };
    if (m.homeFromMatch === completedMatchId) {
      updated.homeTeamId = m.phase === '3rd' ? loserId : winnerId;
    }
    if (m.awayFromMatch === completedMatchId) {
      updated.awayTeamId = m.phase === '3rd' ? loserId : winnerId;
    }
    return updated;
  });
}

// After group stage completes, seed knockout bracket with group qualifiers
export function seedKnockoutFromGroups(
  matches: CompMatch[],
  groups: CompGroup[],
  standings: Record<string, Standing>,
  qualifyPerGroup: number,
): CompMatch[] {
  // For each group, get top N teams
  const qualifiers: string[] = [];
  for (const group of groups) {
    const groupStandings = group.teamIds.map((id) => standings[id]).filter(Boolean);
    const sorted = sortStandings(groupStandings);
    qualifiers.push(...sorted.slice(0, qualifyPerGroup).map((s) => s.teamId));
  }

  // Find the first knockout round matches (phase !== 'group', no homeTeamId/awayTeamId)
  const knockoutFirstRound = matches
    .filter((m) => m.phase !== 'group' && m.phase !== '3rd')
    .sort((a, b) => a.round - b.round);

  const firstRound = knockoutFirstRound[0]?.round;
  const firstRoundMatches = knockoutFirstRound.filter((m) => m.round === firstRound);

  // Assign qualifiers to slots (alternating group leaders for better seeding)
  let qi = 0;
  return matches.map((m) => {
    if (!firstRoundMatches.some((fm) => fm.id === m.id)) return m;
    const updated = { ...m };
    if (updated.homeTeamId === null && qi < qualifiers.length) {
      updated.homeTeamId = qualifiers[qi++];
    }
    if (updated.awayTeamId === null && qi < qualifiers.length) {
      updated.awayTeamId = qualifiers[qi++];
    }
    return updated;
  });
}
