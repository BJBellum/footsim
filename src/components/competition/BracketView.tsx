import type { CompMatch } from '@/lib/competition/types';
import type { Team } from '@/lib/types';

type Props = {
  matches: CompMatch[];
  teams: Record<string, Team>;
  onSimulate?: (matchId: string) => void;
};

const PHASE_ORDER: Record<string, number> = {
  R64: 0, R32: 1, R16: 2, QF: 3, SF: 4, '3rd': 5, F: 6,
};

const PHASE_LABEL: Record<string, string> = {
  R64: '64ème', R32: '32ème', R16: '16ème', QF: 'Quarts', SF: 'Demies', '3rd': '3ème place', F: 'Finale',
};

export function BracketView({ matches, teams, onSimulate }: Props) {
  // Group by phase
  const phases = [...new Set(matches.map((m) => m.phase))].sort(
    (a, b) => (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99),
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max pb-4">
        {phases.map((phase) => {
          const phaseMatches = matches
            .filter((m) => m.phase === phase)
            .sort((a, b) => a.leg - b.leg);
          return (
            <div key={phase} className="flex flex-col gap-3 min-w-[220px]">
              <div className="text-xs font-medium uppercase tracking-widest text-muted text-center">
                {PHASE_LABEL[phase] ?? phase}
              </div>
              {phaseMatches.map((m) => (
                <BracketMatch key={m.id} match={m} teams={teams} onSimulate={onSimulate} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatch({
  match,
  teams,
  onSimulate,
}: {
  match: CompMatch;
  teams: Record<string, Team>;
  onSimulate?: (matchId: string) => void;
}) {
  const home = match.homeTeamId ? teams[match.homeTeamId] : null;
  const away = match.awayTeamId ? teams[match.awayTeamId] : null;
  const done = match.status === 'completed';
  const canSim = match.status === 'pending' && match.homeTeamId !== null && match.awayTeamId !== null;

  const homeWon = done && match.result
    ? match.result.home > match.result.away
    || (match.result.penalties?.home ?? 0) > (match.result.penalties?.away ?? 0)
    : false;
  const awayWon = done && match.result
    ? match.result.away > match.result.home
    || (match.result.penalties?.away ?? 0) > (match.result.penalties?.home ?? 0)
    : false;

  return (
    <div
      className={`rounded-lg border bg-surface p-3 space-y-2 text-sm ${
        done ? 'border-border/60' : 'border-border'
      }`}
    >
      {match.leg === 2 && (
        <div className="text-[10px] text-muted uppercase tracking-widest">Retour</div>
      )}
      <BracketTeamRow
        team={home}
        score={match.result?.home}
        penalties={match.result?.penalties?.home}
        winner={homeWon}
        tbd={match.homeTeamId === null}
      />
      <BracketTeamRow
        team={away}
        score={match.result?.away}
        penalties={match.result?.penalties?.away}
        winner={awayWon}
        tbd={match.awayTeamId === null}
      />
      {canSim && onSimulate && (
        <button
          onClick={() => onSimulate(match.id)}
          className="mt-1 w-full rounded text-xs text-accent hover:text-accent/70 transition-colors py-1 text-left"
        >
          ▶ Simuler
        </button>
      )}
    </div>
  );
}

function BracketTeamRow({
  team,
  score,
  penalties,
  winner,
  tbd,
}: {
  team: Team | null;
  score?: number;
  penalties?: number;
  winner: boolean;
  tbd: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${winner ? 'font-medium' : 'text-muted'}`}>
      <div className="flex items-center gap-2 min-w-0">
        {team?.flag ? (
          <img src={team.flag} alt="" className="h-4 w-4 object-cover rounded-sm shrink-0" />
        ) : (
          <div className="h-4 w-4 rounded-sm bg-border shrink-0" />
        )}
        <span className="truncate">{tbd ? 'À définir' : (team?.name ?? '?')}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {score !== undefined && <span className={winner ? 'text-accent' : ''}>{score}</span>}
        {penalties !== undefined && (
          <span className="text-xs text-muted">({penalties})</span>
        )}
      </div>
    </div>
  );
}
