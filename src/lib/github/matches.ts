import type { MatchState, MatchInput } from '@/lib/sim/types';
import type { Team } from '@/lib/types';
import type { CompetitionKind, CompetitionScope } from '@/lib/competition/types';
import { readJson, writeJson } from './api';

// ─── CMF match point formula ─────────────────────────────────────────────────
// Base: W=3, D=1, L=0  ×  scope multiplier  ×  kind multiplier  ×  opp factor
// Opp factor = sqrt(oppStrength / 50) clamped [0.5, 2.0]
// Mirrors FIFA ranking logic: beating a strong team = more pts; losing to weak = bigger loss

const SCOPE_MATCH_MULT: Record<CompetitionScope, number> = {
  internationale: 2.0,
  continentale: 1.6,
  nationale: 1.2,
  regionale: 1.0,
  autre: 0.8,
};
const KIND_MATCH_MULT: Record<CompetitionKind, number> = {
  officielle: 1.5,
  amicale: 0.8,
};

export function calcCmfMatchPoints(opts: {
  scoreFor: number;
  scoreAgainst: number;
  opponentStrength: number;
  compKind?: CompetitionKind;
  compScope?: CompetitionScope;
}): number {
  const base = opts.scoreFor > opts.scoreAgainst ? 3 : opts.scoreFor === opts.scoreAgainst ? 1 : 0;
  const scope = SCOPE_MATCH_MULT[opts.compScope ?? 'autre'];
  const kind = KIND_MATCH_MULT[opts.compKind ?? 'amicale'];
  const oppFactor = Math.min(2.0, Math.max(0.5, Math.sqrt(opts.opponentStrength / 50)));
  return Math.round(base * scope * kind * oppFactor * 10) / 10;
}

export type StoredMatch = {
  id: string;
  playedAt: string;
  speed: MatchState['speed'];
  home: SideResult;
  away: SideResult;
  events: MatchState['events'];
  finalScore: { home: number; away: number };
};

export type SideResult = {
  teamId: string;
  teamSlug: string;
  teamName: string;
  formation: string;
  lineup: string[];
  score: number;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  yellows: string[];
  reds: string[];
  possession: number;
};

export type RecentMatchSummary = {
  matchId: string;
  playedAt: string;
  opponentSlug: string;
  opponentName: string;
  homeAway: 'home' | 'away';
  /** Team IDs for reliable side identification */
  homeTeamId?: string;
  awayTeamId?: string;
  scoreFor: number;
  scoreAgainst: number;
  /** CMF ranking points earned/lost for this match */
  cmfPoints?: number;
  /** Opponent globalStrength at time of match (for display) */
  opponentStrength?: number;
  compKind?: import('@/lib/competition/types').CompetitionKind;
  compScope?: import('@/lib/competition/types').CompetitionScope;
};

const MATCH_PATH = (id: string) => `data/matches/${id}.json`;
const TEAM_PATH = (slug: string) => `data/teams/${slug}/team.json`;

const RECENT_LIMIT = 20;

export type SaveMatchMeta = {
  compKind?: CompetitionKind;
  compScope?: CompetitionScope;
  homeStrength?: number;
  awayStrength?: number;
};

export async function saveMatch(
  input: MatchInput,
  state: MatchState,
  token: string,
  meta?: SaveMatchMeta,
): Promise<void> {
  const stored: StoredMatch = {
    id: state.matchId,
    playedAt: new Date().toISOString(),
    speed: state.speed,
    home: buildSide(input.home.team, input.home.formation, input.home.players.map((p) => p.id), state, 'home'),
    away: buildSide(input.away.team, input.away.formation, input.away.players.map((p) => p.id), state, 'away'),
    events: state.events,
    finalScore: state.score,
  };

  const existing = await readJson<StoredMatch>(MATCH_PATH(state.matchId), token);
  await writeJson({
    path: MATCH_PATH(state.matchId),
    token,
    data: stored,
    message: `feat(matches): record ${input.home.team.slug} vs ${input.away.team.slug} (${state.score.home}-${state.score.away})`,
    sha: existing?.sha,
  });

  const homeCmf = calcCmfMatchPoints({
    scoreFor: state.score.home,
    scoreAgainst: state.score.away,
    opponentStrength: meta?.awayStrength ?? 50,
    compKind: meta?.compKind,
    compScope: meta?.compScope,
  });
  const awayCmf = calcCmfMatchPoints({
    scoreFor: state.score.away,
    scoreAgainst: state.score.home,
    opponentStrength: meta?.homeStrength ?? 50,
    compKind: meta?.compKind,
    compScope: meta?.compScope,
  });

  await Promise.all([
    appendRecent(input.home.team, {
      matchId: state.matchId,
      playedAt: stored.playedAt,
      opponentSlug: input.away.team.slug,
      opponentName: input.away.team.name,
      homeTeamId: input.home.team.id,
      awayTeamId: input.away.team.id,
      homeAway: 'home',
      scoreFor: state.score.home,
      scoreAgainst: state.score.away,
      cmfPoints: homeCmf,
      opponentStrength: meta?.awayStrength,
      compKind: meta?.compKind,
      compScope: meta?.compScope,
    }, token),
    appendRecent(input.away.team, {
      matchId: state.matchId,
      playedAt: stored.playedAt,
      opponentSlug: input.home.team.slug,
      opponentName: input.home.team.name,
      homeTeamId: input.home.team.id,
      awayTeamId: input.away.team.id,
      homeAway: 'away',
      scoreFor: state.score.away,
      scoreAgainst: state.score.home,
      cmfPoints: awayCmf,
      opponentStrength: meta?.homeStrength,
      compKind: meta?.compKind,
      compScope: meta?.compScope,
    }, token),
  ]);

  // Persist coach suspension: set if ejected this match, clear if was suspended (served)
  const homeEjected = state.coachEjected?.home ?? false;
  const awayEjected = state.coachEjected?.away ?? false;
  if (homeEjected || input.home.team.coachSuspended) {
    await updateCoachSuspension(input.home.team, homeEjected, token);
  }
  if (awayEjected || input.away.team.coachSuspended) {
    await updateCoachSuspension(input.away.team, awayEjected, token);
  }
}

async function updateCoachSuspension(team: Team, suspended: boolean, token: string): Promise<void> {
  const path = TEAM_PATH(team.slug);
  const existing = await readJson<Team & { sha?: string }>(path, token);
  if (!existing) return;
  await writeJson({
    path,
    token,
    data: { ...existing, coachSuspended: suspended },
    message: `fix(coach): ${suspended ? 'suspend' : 'reinstate'} coach for ${team.slug}`,
    sha: existing.sha,
  });
}

function buildSide(
  team: Team,
  formation: string,
  lineup: string[],
  state: MatchState,
  side: 'home' | 'away',
): SideResult {
  const onPitch = side === 'home' ? state.homeOnPitch : state.awayOnPitch;
  return {
    teamId: team.id,
    teamSlug: team.slug,
    teamName: team.name,
    formation,
    lineup: onPitch.length ? onPitch : lineup,
    score: state.score[side],
    shots: state.shots[side],
    shotsOnTarget: state.shotsOnTarget[side],
    fouls: state.fouls[side],
    yellows: state.cards[side].yellow,
    reds: state.cards[side].red,
    possession: state.possession[side],
  };
}

// Serialize writes per team slug to prevent concurrent SHA conflicts
const appendQueues = new Map<string, Promise<void>>();

function appendRecent(team: Team, summary: RecentMatchSummary, token: string): Promise<void> {
  const prev = appendQueues.get(team.slug) ?? Promise.resolve();
  const next = prev.then(() => doAppendRecent(team, summary, token)).catch(() => doAppendRecent(team, summary, token));
  // Store only the chain tail so the map doesn't grow forever
  appendQueues.set(team.slug, next.then(() => {}, () => {}));
  return next;
}

async function doAppendRecent(team: Team, summary: RecentMatchSummary, token: string): Promise<void> {
  type TeamWithRecent = Team & { recentMatches?: RecentMatchSummary[] };
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await readJson<TeamWithRecent>(TEAM_PATH(team.slug), token);
    if (!existing) return;
    const recent = existing.data.recentMatches ?? [];
    if (recent.some((r) => r.matchId === summary.matchId && r.homeAway === summary.homeAway)) return;
    const next = [summary, ...recent].slice(0, RECENT_LIMIT);
    const updated: TeamWithRecent = { ...existing.data, recentMatches: next };
    try {
      await writeJson({
        path: TEAM_PATH(team.slug),
        token,
        data: updated,
        message: `chore(teams/${team.slug}): append recent match`,
        sha: existing.sha,
      });
      return;
    } catch (err) {
      const msg = String(err);
      if ((msg.includes('409') || msg.includes('422')) && attempt < 3) continue;
      throw err;
    }
  }
}
