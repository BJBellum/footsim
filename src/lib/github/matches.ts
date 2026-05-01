import type { MatchState, MatchInput } from '@/lib/sim/types';
import type { Team } from '@/lib/types';
import { readJson, writeJson } from './api';

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
  scoreFor: number;
  scoreAgainst: number;
};

const MATCH_PATH = (id: string) => `data/matches/${id}.json`;
const TEAM_PATH = (slug: string) => `data/teams/${slug}/team.json`;

const RECENT_LIMIT = 20;

export async function saveMatch(
  input: MatchInput,
  state: MatchState,
  token: string,
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

  await appendRecent(input.home.team, {
    matchId: state.matchId,
    playedAt: stored.playedAt,
    opponentSlug: input.away.team.slug,
    opponentName: input.away.team.name,
    homeAway: 'home',
    scoreFor: state.score.home,
    scoreAgainst: state.score.away,
  }, token);

  await appendRecent(input.away.team, {
    matchId: state.matchId,
    playedAt: stored.playedAt,
    opponentSlug: input.home.team.slug,
    opponentName: input.home.team.name,
    homeAway: 'away',
    scoreFor: state.score.away,
    scoreAgainst: state.score.home,
  }, token);
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

async function appendRecent(team: Team, summary: RecentMatchSummary, token: string): Promise<void> {
  type TeamWithRecent = Team & { recentMatches?: RecentMatchSummary[] };
  // Retry loop: re-read + recompute on every attempt to avoid SHA conflicts
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await readJson<TeamWithRecent>(TEAM_PATH(team.slug), token);
    if (!existing) return;
    const recent = existing.data.recentMatches ?? [];
    // Skip if already appended (idempotence guard)
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
