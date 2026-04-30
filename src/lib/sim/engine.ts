import type { Player, Team } from '@/lib/types';
import type { MatchEvent, MatchState, SideRatings } from './types';
import { ZONE, eventText } from './events';

export type EngineCtx = {
  home: { team: Team; players: Map<string, Player>; ratings: SideRatings };
  away: { team: Team; players: Map<string, Player>; ratings: SideRatings };
  eventCounter: { v: number };
};

function rand(): number { return Math.random(); }
function chance(p: number): boolean { return rand() < p; }
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }
function clamp(n: number, lo: number, hi: number) { return n < lo ? lo : n > hi ? hi : n; }

export function initialState(matchId: string, speed: MatchState['speed']): MatchState {
  return {
    matchId,
    status: 'pregame',
    minute: 0,
    half: 1,
    addedTime: 0,
    homeAddedTime: 1 + Math.floor(rand() * 5),
    awayAddedTime: 1 + Math.floor(rand() * 7),
    score: { home: 0, away: 0 },
    events: [],
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    cards: { home: { yellow: [], red: [] }, away: { yellow: [], red: [] } },
    possession: { home: 50, away: 50 },
    possessionTicks: { home: 0, away: 0 },
    ball: { x: 50, y: 25 },
    speed,
    homeOnPitch: [],
    awayOnPitch: [],
  };
}

function pushEvent(state: MatchState, ctx: EngineCtx, base: Omit<MatchEvent, 'id' | 'text' | 'minute' | 'half'>, teamName: string, playerName?: string): MatchEvent {
  const minuteDisplay = state.half === 1 && state.minute > 45
    ? `45+${state.minute - 45}`
    : state.half === 2 && state.minute > 90
      ? `90+${state.minute - 90}`
      : String(state.minute);
  const ev: MatchEvent = {
    id: ++ctx.eventCounter.v,
    minute: state.minute,
    half: state.half,
    text: eventText(base.type, Number(minuteDisplay) || state.minute, teamName, playerName),
    ...base,
  };
  state.events.push(ev);
  return ev;
}

function pickAttacker(side: 'home' | 'away', ctx: EngineCtx, state: MatchState): Player | null {
  const onPitch = side === 'home' ? state.homeOnPitch : state.awayOnPitch;
  const players = side === 'home' ? ctx.home.players : ctx.away.players;
  const candidates = onPitch.map((id) => players.get(id)!).filter((p) => p && ['ST','LW','RW','AM','CM'].includes(p.position));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.stats.technical.finishing + b.stats.mental.composure) - (a.stats.technical.finishing + a.stats.mental.composure));
  const top = candidates.slice(0, Math.min(4, candidates.length));
  return pick(top);
}

function pickFouler(side: 'home' | 'away', ctx: EngineCtx, state: MatchState): Player | null {
  const onPitch = side === 'home' ? state.homeOnPitch : state.awayOnPitch;
  const players = side === 'home' ? ctx.home.players : ctx.away.players;
  const cands = onPitch.map((id) => players.get(id)!).filter(Boolean);
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.stats.mental.aggression - a.stats.mental.aggression);
  return pick(cands.slice(0, 5));
}

function gkOf(side: 'home' | 'away', ctx: EngineCtx, state: MatchState): Player | null {
  const onPitch = side === 'home' ? state.homeOnPitch : state.awayOnPitch;
  const players = side === 'home' ? ctx.home.players : ctx.away.players;
  for (const id of onPitch) {
    const p = players.get(id);
    if (p?.position === 'GK') return p;
  }
  return null;
}

function teamRatingMultiplier(side: 'home' | 'away', state: MatchState): number {
  const reds = side === 'home' ? state.cards.home.red.length : state.cards.away.red.length;
  return Math.pow(0.93, reds);
}

export function tick(state: MatchState, ctx: EngineCtx): MatchState {
  if (state.status === 'pregame') {
    state.status = 'firstHalf';
    state.minute = 1;
    pushEvent(state, ctx, { type: 'kickoff', side: null, ballPos: ZONE.centre }, ctx.home.team.name);
    return state;
  }

  if (state.status === 'fulltime') return state;

  if (state.status === 'halftime') {
    state.status = 'secondHalf';
    state.half = 2;
    state.minute = 46;
    state.ball = ZONE.centre;
    return state;
  }

  state.minute++;

  // Half-time check
  if (state.half === 1 && state.minute > 45 + state.homeAddedTime) {
    state.status = 'halftime';
    pushEvent(state, ctx, { type: 'halftime', side: null, ballPos: ZONE.centre }, ctx.home.team.name);
    return state;
  }
  // Full-time check
  if (state.half === 2 && state.minute > 90 + state.awayAddedTime) {
    state.status = 'fulltime';
    pushEvent(state, ctx, { type: 'fulltime', side: null, ballPos: ZONE.centre }, ctx.home.team.name);
    return state;
  }

  // Possession roll
  const homeMid = ctx.home.ratings.midfield * teamRatingMultiplier('home', state);
  const awayMid = ctx.away.ratings.midfield * teamRatingMultiplier('away', state);
  const pHome = homeMid / (homeMid + awayMid);
  const possessing: 'home' | 'away' = chance(pHome) ? 'home' : 'away';
  if (possessing === 'home') state.possessionTicks.home++;
  else state.possessionTicks.away++;
  const totalTicks = state.possessionTicks.home + state.possessionTicks.away;
  state.possession.home = Math.round((state.possessionTicks.home / totalTicks) * 100);
  state.possession.away = 100 - state.possession.home;

  // Event roll
  const r = rand();
  const opp = possessing === 'home' ? 'away' : 'home';
  const oppName = possessing === 'home' ? ctx.away.team.name : ctx.home.team.name;
  const teamName = possessing === 'home' ? ctx.home.team.name : ctx.away.team.name;
  const myAttack = (possessing === 'home' ? ctx.home.ratings.attack : ctx.away.ratings.attack) * teamRatingMultiplier(possessing, state);
  const oppDefense = (possessing === 'home' ? ctx.away.ratings.defense : ctx.home.ratings.defense) * teamRatingMultiplier(opp, state);
  const pAttack = myAttack / (myAttack + oppDefense);

  // weights
  const wShot = 0.08 * (0.6 + pAttack);
  const wFoul = 0.08;
  const wCorner = 0.04;
  const wOffside = 0.03;
  const wKeyPass = 0.10;
  const total = wShot + wFoul + wCorner + wOffside + wKeyPass;

  if (r < wShot) {
    state.shots[possessing]++;
    const shooter = pickAttacker(possessing, ctx, state);
    const oppGk = gkOf(opp, ctx, state);
    const fin = shooter?.stats.technical.finishing ?? 10;
    const com = shooter?.stats.mental.composure ?? 10;
    const gkVal = oppGk?.overall ?? 50;
    const pGoal = clamp(sigmoid((fin + com - gkVal * 0.5) / 8), 0.04, 0.55);
    const onTarget = chance(0.55);
    if (onTarget) {
      state.shotsOnTarget[possessing]++;
      if (chance(pGoal)) {
        state.score[possessing]++;
        pushEvent(state, ctx, {
          type: 'goal',
          side: possessing,
          playerId: shooter?.id,
          ballPos: possessing === 'home' ? ZONE.awayBox : ZONE.homeBox,
        }, teamName, shooter ? `${shooter.firstName} ${shooter.lastName}` : undefined);
        state.ball = ZONE.centre;
      } else {
        pushEvent(state, ctx, {
          type: 'save',
          side: opp,
          playerId: oppGk?.id,
          ballPos: possessing === 'home' ? ZONE.awayBox : ZONE.homeBox,
        }, oppName, oppGk ? `${oppGk.firstName} ${oppGk.lastName}` : undefined);
      }
    } else {
      pushEvent(state, ctx, {
        type: 'shot',
        side: possessing,
        playerId: shooter?.id,
        ballPos: possessing === 'home' ? ZONE.awayBox : ZONE.homeBox,
      }, teamName, shooter ? `${shooter.firstName} ${shooter.lastName}` : undefined);
    }
  } else if (r < wShot + wFoul) {
    state.fouls[opp]++;
    const fouler = pickFouler(opp, ctx, state);
    pushEvent(state, ctx, {
      type: 'foul',
      side: opp,
      playerId: fouler?.id,
      ballPos: ZONE.centre,
    }, oppName, fouler ? `${fouler.firstName} ${fouler.lastName}` : undefined);
    if (fouler) {
      const aggressionFactor = (fouler.stats.mental.aggression / 20);
      const pYellow = 0.13 + 0.06 * aggressionFactor;
      const pRed = 0.005 + 0.005 * aggressionFactor;
      if (chance(pRed)) {
        applyRed(state, ctx, opp, fouler);
      } else if (chance(pYellow)) {
        const already = state.cards[opp].yellow.includes(fouler.id);
        if (already) {
          applyRed(state, ctx, opp, fouler);
        } else {
          state.cards[opp].yellow.push(fouler.id);
          pushEvent(state, ctx, {
            type: 'yellow',
            side: opp,
            playerId: fouler.id,
            ballPos: ZONE.centre,
          }, oppName, `${fouler.firstName} ${fouler.lastName}`);
        }
      }
    }
  } else if (r < wShot + wFoul + wCorner) {
    pushEvent(state, ctx, {
      type: 'corner',
      side: possessing,
      ballPos: possessing === 'home' ? ZONE.homeRightCorner : ZONE.awayLeftCorner,
    }, teamName);
  } else if (r < wShot + wFoul + wCorner + wOffside) {
    pushEvent(state, ctx, {
      type: 'offside',
      side: possessing,
      ballPos: possessing === 'home' ? ZONE.awayBox : ZONE.homeBox,
    }, teamName);
  } else if (r < total) {
    const passer = pickAttacker(possessing, ctx, state);
    pushEvent(state, ctx, {
      type: 'keyPass',
      side: possessing,
      playerId: passer?.id,
      ballPos: possessing === 'home' ? ZONE.midfieldAway : ZONE.midfieldHome,
    }, teamName, passer ? `${passer.firstName} ${passer.lastName}` : undefined);
  } else {
    state.ball = possessing === 'home' ? ZONE.midfieldAway : ZONE.midfieldHome;
  }

  const last = state.events[state.events.length - 1];
  if (last?.ballPos) state.ball = last.ballPos;

  return state;
}

function applyRed(state: MatchState, ctx: EngineCtx, side: 'home' | 'away', player: Player): void {
  state.cards[side].red.push(player.id);
  if (side === 'home') {
    state.homeOnPitch = state.homeOnPitch.filter((id) => id !== player.id);
  } else {
    state.awayOnPitch = state.awayOnPitch.filter((id) => id !== player.id);
  }
  pushEvent(state, ctx, {
    type: 'red',
    side,
    playerId: player.id,
    ballPos: ZONE.centre,
  }, side === 'home' ? ctx.home.team.name : ctx.away.team.name, `${player.firstName} ${player.lastName}`);
}
