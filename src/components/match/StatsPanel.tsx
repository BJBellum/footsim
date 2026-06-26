import type { MatchState } from '@/lib/sim/types';
import type { MatchStatSnapshot } from '@/lib/competition/types';

type StatSide = { home: number; away: number };

function Bar({ label, home, away, suffix }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  const pHome = (home / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{home}{suffix ?? ''}</span>
        <span className="uppercase tracking-widest">{label}</span>
        <span>{away}{suffix ?? ''}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-border">
        <div className="bg-accent transition-all duration-300" style={{ width: `${pHome}%` }} />
        <div className="bg-text transition-all duration-300" style={{ width: `${100 - pHome}%` }} />
      </div>
    </div>
  );
}

function CardRow({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium tabular-nums">{home}</span>
      <span className="uppercase tracking-widest text-muted">{label}</span>
      <span className="font-medium tabular-nums">{away}</span>
    </div>
  );
}

function StatRows({ s, yellowCards, redCards }: {
  s: {
    possession: StatSide; shots: StatSide; shotsOnTarget: StatSide; xg?: StatSide; saves?: StatSide;
    passes?: StatSide; fouls: StatSide; corners?: StatSide; offsides?: StatSide;
    freekicks?: StatSide; dribbles?: StatSide; clearances?: StatSide; keyPasses?: StatSide;
  };
  yellowCards: StatSide;
  redCards: StatSide;
}) {
  return (
    <div className="space-y-3">
      <Bar label="Possession" home={s.possession.home} away={s.possession.away} suffix="%" />
      <Bar label="Tirs" home={s.shots.home} away={s.shots.away} />
      <Bar label="Tirs cadrés" home={s.shotsOnTarget.home} away={s.shotsOnTarget.away} />
      {s.xg && <Bar label="xG" home={s.xg.home} away={s.xg.away} />}
      {s.saves && <Bar label="Arrêts" home={s.saves.home} away={s.saves.away} />}
      {s.passes && <Bar label="Passes" home={s.passes.home} away={s.passes.away} />}
      <Bar label="Fautes" home={s.fouls.home} away={s.fouls.away} />
      {s.corners && <Bar label="Corners" home={s.corners.home} away={s.corners.away} />}
      {s.offsides && <Bar label="Hors-jeu" home={s.offsides.home} away={s.offsides.away} />}
      {s.freekicks && <Bar label="Coups francs" home={s.freekicks.home} away={s.freekicks.away} />}
      {s.keyPasses && <Bar label="Passes clés" home={s.keyPasses.home} away={s.keyPasses.away} />}
      {s.dribbles && <Bar label="Dribbles" home={s.dribbles.home} away={s.dribbles.away} />}
      {s.clearances && <Bar label="Dégagements" home={s.clearances.home} away={s.clearances.away} />}
      <CardRow label="Cartons jaunes" home={yellowCards.home} away={yellowCards.away} />
      <CardRow label="Cartons rouges" home={redCards.home} away={redCards.away} />
    </div>
  );
}

export function StatsPanel({ state }: { state: MatchState }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-subtle-sm">
      <h3 className="font-display text-sm uppercase tracking-widest text-muted">Statistiques</h3>
      <StatRows
        s={state}
        yellowCards={{ home: state.cards.home.yellow.length, away: state.cards.away.yellow.length }}
        redCards={{ home: state.cards.home.red.length, away: state.cards.away.red.length }}
      />
    </div>
  );
}

export function MatchSummaryStatsPanel({ snap, homeName, awayName }: {
  snap: MatchStatSnapshot;
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs font-medium text-muted">
        <span>{homeName}</span>
        <span>{awayName}</span>
      </div>
      <StatRows
        s={snap}
        yellowCards={snap.yellowCards}
        redCards={snap.redCards}
      />
    </div>
  );
}
