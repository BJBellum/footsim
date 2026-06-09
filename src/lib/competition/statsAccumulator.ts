import type { Player, Team } from '@/lib/types';
import type { MatchState } from '@/lib/sim/types';
import type { PlayerCompStats } from './types';

export function accumulateMatchStats(
  prev: Record<string, PlayerCompStats>,
  state: MatchState,
  home: { team: Team; players: Player[] },
  away: { team: Team; players: Player[] },
): Record<string, PlayerCompStats> {
  const stats = { ...prev };

  const homeMap = new Map(home.players.map((p) => [p.id, p]));
  const awayMap = new Map(away.players.map((p) => [p.id, p]));

  function resolvePlayer(id: string): [Player, Team] | null {
    const hp = homeMap.get(id);
    if (hp) return [hp, home.team];
    const ap = awayMap.get(id);
    if (ap) return [ap, away.team];
    return null;
  }

  function ensure(p: Player, team: Team): PlayerCompStats {
    if (!stats[p.id]) {
      stats[p.id] = {
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        teamId: team.id,
        teamName: team.name,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        yellowCards: 0,
        redCards: 0,
      };
    }
    return stats[p.id];
  }

  const events = state.events;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    if (ev.type === 'goal' && ev.playerId) {
      const r = resolvePlayer(ev.playerId);
      if (r) ensure(r[0], r[1]).goals++;

      // assist = last keyPass on same side before this goal (within 3 prior events)
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prior = events[j];
        if (prior.type === 'keyPass' && prior.side === ev.side && prior.playerId) {
          const ra = resolvePlayer(prior.playerId);
          if (ra) ensure(ra[0], ra[1]).assists++;
          break;
        }
        if (prior.type === 'goal') break;
      }
    }

    if (ev.type === 'yellow' && ev.playerId) {
      const r = resolvePlayer(ev.playerId);
      if (r) ensure(r[0], r[1]).yellowCards++;
    }

    if (ev.type === 'red' && ev.playerId) {
      const r = resolvePlayer(ev.playerId);
      if (r) ensure(r[0], r[1]).redCards++;
    }
  }

  // Clean sheets: GK of the side that conceded 0 goals
  function findGk(players: Map<string, Player>, onPitch: string[]): Player | undefined {
    for (const id of onPitch) {
      const p = players.get(id);
      if (p?.position === 'GK') return p;
    }
    return undefined;
  }

  if (state.score.away === 0) {
    const gk = findGk(homeMap, state.homeOnPitch);
    if (gk) ensure(gk, home.team).cleanSheets++;
  }
  if (state.score.home === 0) {
    const gk = findGk(awayMap, state.awayOnPitch);
    if (gk) ensure(gk, away.team).cleanSheets++;
  }

  return stats;
}
