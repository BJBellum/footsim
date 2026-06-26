import { useState } from 'react';
import type { PlayerCompStats } from '@/lib/competition/types';
import type { Team } from '@/lib/types';
import type { Injury, Suspension } from '@/lib/competition/injuries';

type Props = {
  playerStats: Record<string, PlayerCompStats>;
  teams: Record<string, Team>;
  injuries?: Injury[];
  suspensions?: Suspension[];
};

type StatCategory = 'goals' | 'assists' | 'saves' | 'cleanSheets' | 'yellowCards' | 'redCards';

const CATEGORIES: { key: StatCategory; label: string; emoji: string; min: number; gkOnly?: boolean }[] = [
  { key: 'goals',       label: 'Meilleurs buteurs',       emoji: '⚽', min: 1 },
  { key: 'assists',     label: 'Meilleurs passeurs',      emoji: '🎯', min: 1 },
  { key: 'saves',       label: 'Meilleurs gardiens',      emoji: '🧤', min: 1, gkOnly: true },
  { key: 'cleanSheets', label: 'Clean sheets',            emoji: '🛡️', min: 1 },
  { key: 'yellowCards', label: 'Cartons jaunes',          emoji: '🟨', min: 1 },
  { key: 'redCards',    label: 'Cartons rouges',          emoji: '🟥', min: 1 },
];

function ratingColor(r: number): string {
  if (r >= 8) return 'text-green-400';
  if (r >= 7) return 'text-accent';
  if (r >= 6) return 'text-text';
  return 'text-muted';
}

function PlayerPopup({
  stat,
  team,
  onClose,
  injuries,
  suspensions,
}: {
  stat: PlayerCompStats;
  team: Team | undefined;
  onClose: () => void;
  injuries?: Injury[];
  suspensions?: Suspension[];
}) {
  const injury = injuries?.find((i) => i.playerName === stat.playerName);
  const suspension = suspensions?.find((s) => s.subjectName === stat.playerName && s.subjectId !== 'coach');
  const recentRatings = stat.matchRatings.slice(-5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 rounded-xl border border-border bg-surface shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {team?.flag && <img src={team.flag} alt="" className="h-7 w-7 object-cover rounded-sm shrink-0" />}
            <div>
              <div className="font-display text-base">{stat.playerName}</div>
              <div className="text-xs text-muted flex items-center gap-2">
                <span>{stat.position}</span>
                <span className="font-medium text-accent">Overall {stat.overall}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors text-lg leading-none">×</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Blessure */}
          {injury && (
            <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2 flex items-start gap-2">
              <span className="text-danger text-sm shrink-0">🤕</span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-danger">Blessé — {injury.severity}</div>
                <div className="text-[10px] text-muted mt-0.5">{injury.description} · {injury.matchesRemaining} match{injury.matchesRemaining > 1 ? 's' : ''} restant{injury.matchesRemaining > 1 ? 's' : ''}</div>
              </div>
            </div>
          )}

          {/* Suspension */}
          {suspension && (
            <div className="rounded border border-warning/30 bg-warning/5 px-3 py-2 flex items-start gap-2">
              <span className="text-warning text-sm shrink-0">🟥</span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-warning">Suspendu</div>
                <div className="text-[10px] text-muted mt-0.5">{suspension.reason} · {suspension.matchesRemaining} match{suspension.matchesRemaining > 1 ? 's' : ''} restant{suspension.matchesRemaining > 1 ? 's' : ''}</div>
              </div>
            </div>
          )}

          {/* Stats grille */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div>
              <div className="text-xl font-display tabular-nums">{stat.goals}</div>
              <div className="text-[10px] text-muted">Buts</div>
            </div>
            <div>
              <div className="text-xl font-display tabular-nums">{stat.assists}</div>
              <div className="text-[10px] text-muted">P.D.</div>
            </div>
            <div>
              <div className={`text-xl font-display tabular-nums ${ratingColor(stat.avgRating)}`}>
                {stat.avgRating > 0 ? stat.avgRating.toFixed(1) : '—'}
              </div>
              <div className="text-[10px] text-muted">Note</div>
            </div>
            {stat.motmCount > 0 ? (
              <div>
                <div className="text-xl font-display tabular-nums text-yellow-400">{stat.motmCount}</div>
                <div className="text-[10px] text-muted">MOTM</div>
              </div>
            ) : <div />}
          </div>

          {/* GK extras */}
          {stat.position === 'GK' && (stat.saves > 0 || stat.cleanSheets > 0) && (
            <div className="grid grid-cols-2 gap-1.5 text-center border-t border-border/50 pt-2">
              {stat.saves > 0 && (
                <div>
                  <div className="text-xl font-display tabular-nums">{stat.saves}</div>
                  <div className="text-[10px] text-muted">Arrêts</div>
                </div>
              )}
              {stat.cleanSheets > 0 && (
                <div>
                  <div className="text-xl font-display tabular-nums">{stat.cleanSheets}</div>
                  <div className="text-[10px] text-muted">Clean sheets</div>
                </div>
              )}
            </div>
          )}

          {/* Cartons */}
          {(stat.yellowCards > 0 || stat.redCards > 0) && (
            <div className="flex gap-3 justify-center border-t border-border/50 pt-2">
              {stat.yellowCards > 0 && (
                <div className="text-center">
                  <div className="text-base font-display tabular-nums text-yellow-400">{stat.yellowCards}</div>
                  <div className="text-[10px] text-muted">Jaunes</div>
                </div>
              )}
              {stat.redCards > 0 && (
                <div className="text-center">
                  <div className="text-base font-display tabular-nums text-danger">{stat.redCards}</div>
                  <div className="text-[10px] text-muted">Rouges</div>
                </div>
              )}
            </div>
          )}

          {/* Forme */}
          {recentRatings.length > 0 && (
            <div className="border-t border-border/50 pt-2">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">Forme récente ({stat.matchRatings.length} matchs)</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {recentRatings.map((r, i) => (
                  <span key={i} className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded border ${r >= 8 ? 'border-green-800/40 bg-green-950/30 text-green-400' : r >= 7 ? 'border-accent/30 bg-accent/5 text-accent' : r >= 6 ? 'border-border text-text' : 'border-border/50 text-muted'}`}>
                    {r.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerName({ stat, onOpen }: { stat: PlayerCompStats; onOpen: (s: PlayerCompStats) => void }) {
  return (
    <button
      onClick={() => onOpen(stat)}
      className="flex-1 min-w-0 truncate text-left font-medium text-accent underline decoration-dotted hover:text-accent/70 transition-colors"
    >
      {stat.playerName}
    </button>
  );
}

export function CompetitionStats({ playerStats, teams, injuries, suspensions }: Props) {
  const [active, setActive] = useState<PlayerCompStats | null>(null);
  const all = Object.values(playerStats);

  if (all.length === 0) {
    return <p className="text-muted text-sm">Aucune statistique — simulez des matchs pour les voir apparaître.</p>;
  }

  const topRated = [...all]
    .filter((p) => p.matchRatings.length >= 1)
    .sort((a, b) => b.avgRating - a.avgRating || b.goals - a.goals)
    .slice(0, 10);

  return (
    <>
      <div className="space-y-6">
        {/* Top par note */}
        {topRated.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted flex items-center gap-2">
              <span>⭐</span>
              <span>Classement par note moyenne</span>
            </div>
            <ol className="space-y-1.5">
              {topRated.map((p, i) => {
                const team = teams[p.teamId];
                return (
                  <li key={p.playerId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right text-xs text-muted tabular-nums">{i + 1}.</span>
                    {team?.flag && <img src={team.flag} alt="" className="h-5 w-5 object-cover rounded-sm shrink-0" />}
                    <PlayerName stat={p} onOpen={setActive} />
                    <span className="shrink-0 text-xs text-muted tabular-nums mr-1">
                      {p.matchRatings.length}m
                    </span>
                    {p.motmCount > 0 && (
                      <span className="shrink-0 text-[10px] text-yellow-400 tabular-nums mr-1">⭐{p.motmCount}</span>
                    )}
                    <span className={`shrink-0 font-display tabular-nums font-medium w-8 text-right ${ratingColor(p.avgRating)}`}>
                      {p.avgRating.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Catégories */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map(({ key, label, emoji, min, gkOnly }) => {
            const ranked = all
              .filter((p) => {
                if (gkOnly && p.position !== 'GK') return false;
                return (p[key] as number) >= min;
              })
              .sort((a, b) => (b[key] as number) - (a[key] as number) || b.avgRating - a.avgRating)
              .slice(0, 8);

            if (ranked.length === 0) return null;

            return (
              <div key={key} className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="text-xs uppercase tracking-widest text-muted flex items-center gap-2">
                  <span>{emoji}</span>
                  <span>{label}</span>
                </div>
                <ol className="space-y-1.5">
                  {ranked.map((p, i) => {
                    const team = teams[p.teamId];
                    return (
                      <li key={p.playerId} className="flex items-center gap-2 text-sm">
                        <span className="w-5 shrink-0 text-right text-xs text-muted tabular-nums">{i + 1}.</span>
                        {team?.flag && <img src={team.flag} alt="" className="h-5 w-5 object-cover rounded-sm shrink-0" />}
                        <PlayerName stat={p} onOpen={setActive} />
                        {p.avgRating > 0 && (
                          <span className={`shrink-0 text-xs tabular-nums mr-0.5 ${ratingColor(p.avgRating)}`}>
                            {p.avgRating.toFixed(1)}
                          </span>
                        )}
                        <span className="shrink-0 font-display tabular-nums text-accent font-medium min-w-[1.5rem] text-right">
                          {p[key] as number}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </div>

      {active && (
        <PlayerPopup
          stat={active}
          team={teams[active.teamId]}
          onClose={() => setActive(null)}
          injuries={injuries}
          suspensions={suspensions}
        />
      )}
    </>
  );
}
