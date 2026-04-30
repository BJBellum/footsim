import type { MatchState } from '@/lib/sim/types';

export function StatsPanel({ state }: { state: MatchState }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-subtle-sm">
      <h3 className="font-display text-sm uppercase tracking-widest text-muted">Statistiques</h3>
      <Bar label="Possession" home={state.possession.home} away={state.possession.away} suffix="%" />
      <Bar label="Tirs" home={state.shots.home} away={state.shots.away} />
      <Bar label="Tirs cadrés" home={state.shotsOnTarget.home} away={state.shotsOnTarget.away} />
      <Bar label="Fautes" home={state.fouls.home} away={state.fouls.away} />
      <CardRow
        label="Cartons jaunes"
        home={state.cards.home.yellow.length}
        away={state.cards.away.yellow.length}
      />
      <CardRow
        label="Cartons rouges"
        home={state.cards.home.red.length}
        away={state.cards.away.red.length}
      />
    </div>
  );
}

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
