import type { PlayerCompStats } from '@/lib/competition/types';
import type { Team } from '@/lib/types';

type Props = {
  playerStats: Record<string, PlayerCompStats>;
  teams: Record<string, Team>;
};

type StatCategory = 'goals' | 'assists' | 'cleanSheets' | 'yellowCards' | 'redCards';

const CATEGORIES: { key: StatCategory; label: string; emoji: string; min: number }[] = [
  { key: 'goals',       label: 'Meilleurs buteurs',         emoji: '⚽', min: 1 },
  { key: 'assists',     label: 'Meilleurs passeurs',        emoji: '🎯', min: 1 },
  { key: 'cleanSheets', label: 'Clean sheets (gardiens)',   emoji: '🧤', min: 1 },
  { key: 'yellowCards', label: 'Cartons jaunes',            emoji: '🟨', min: 1 },
  { key: 'redCards',    label: 'Cartons rouges',            emoji: '🟥', min: 1 },
];

export function CompetitionStats({ playerStats, teams }: Props) {
  const all = Object.values(playerStats);

  if (all.length === 0) {
    return <p className="text-muted text-sm">Aucune statistique — simulez des matchs pour les voir apparaître.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {CATEGORIES.map(({ key, label, emoji, min }) => {
        const ranked = all
          .filter((p) => p[key] >= min)
          .sort((a, b) => b[key] - a[key])
          .slice(0, 10);

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
                    {team?.flag && (
                      <img src={team.flag} alt="" className="h-5 w-5 object-cover rounded-sm shrink-0" />
                    )}
                    <span className="flex-1 min-w-0 truncate">{p.playerName}</span>
                    <span className="shrink-0 font-display tabular-nums text-accent font-medium">{p[key]}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
