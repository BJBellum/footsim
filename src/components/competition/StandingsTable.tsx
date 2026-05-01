import type { Standing } from '@/lib/competition/types';
import type { Team } from '@/lib/types';
import { sortStandings } from '@/lib/competition/scheduler';

type Props = {
  standings: Standing[];
  teams: Record<string, Team>;
  highlightCount?: number;
  title?: string;
};

export function StandingsTable({ standings, teams, highlightCount, title }: Props) {
  const sorted = sortStandings(standings);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {title && (
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-muted">{title}</div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
            <th className="px-3 py-2 text-left w-6">#</th>
            <th className="px-3 py-2 text-left">Équipe</th>
            <th className="px-3 py-2 text-center">J</th>
            <th className="px-3 py-2 text-center">G</th>
            <th className="px-3 py-2 text-center">N</th>
            <th className="px-3 py-2 text-center">P</th>
            <th className="px-3 py-2 text-center">BP</th>
            <th className="px-3 py-2 text-center">BC</th>
            <th className="px-3 py-2 text-center">DB</th>
            <th className="px-3 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => {
            const team = teams[s.teamId];
            const qualified = highlightCount !== undefined && idx < highlightCount;
            return (
              <tr
                key={s.teamId}
                className={`border-b border-border/50 last:border-0 transition-colors ${
                  qualified ? 'bg-accent/5' : 'hover:bg-border/20'
                }`}
              >
                <td className="px-3 py-2 text-muted text-xs">{idx + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {team?.flag && (
                      <img src={team.flag} alt="" className="h-5 w-5 object-cover rounded-sm" />
                    )}
                    <span className={qualified ? 'font-medium text-accent' : ''}>
                      {team?.name ?? s.teamId}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-muted">{s.played}</td>
                <td className="px-3 py-2 text-center">{s.won}</td>
                <td className="px-3 py-2 text-center text-muted">{s.drawn}</td>
                <td className="px-3 py-2 text-center">{s.lost}</td>
                <td className="px-3 py-2 text-center">{s.goalsFor}</td>
                <td className="px-3 py-2 text-center text-muted">{s.goalsAgainst}</td>
                <td className="px-3 py-2 text-center">{s.goalsFor - s.goalsAgainst}</td>
                <td className="px-3 py-2 text-center font-bold text-accent">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
