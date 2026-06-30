import type { CompMatch } from '@/lib/competition/types';
import type { Team } from '@/lib/types';

type LPMPair = { leg1: CompMatch; leg2: CompMatch | undefined };

/** Resolve the qualifier for an LPM barrage A/R duel: manual override first, then aggregate score / penalties. */
export function resolveLPMPlayoffQualifier(
  leg1: CompMatch,
  leg2: CompMatch | undefined,
  manualOverrides?: Record<string, string>,
): string | null {
  const override = manualOverrides?.[leg1.id];
  if (override) return override;

  if (!leg2 || leg1.status !== 'completed' || leg2.status !== 'completed') return null;
  const l1h = leg1.result?.home ?? 0;
  const l1a = leg1.result?.away ?? 0;
  const l2h = leg2.result?.home ?? 0;
  const l2a = leg2.result?.away ?? 0;
  // Depuis leg1: higher=away (reçoit au retour), lower=home. Agrégat: higher = l1a + l2h, lower = l1h + l2a
  const aggHigher = l1a + l2h;
  const aggLower = l1h + l2a;
  if (aggHigher > aggLower) return leg1.awayTeamId ?? null;
  if (aggLower > aggHigher) return leg1.homeTeamId ?? null;
  if (leg2.result?.penalties) {
    return leg2.result.penalties.home > leg2.result.penalties.away
      ? (leg2.homeTeamId ?? null)
      : (leg2.awayTeamId ?? null);
  }
  return null;
}

export function LPMBracketView({
  matches,
  teams,
  onSimulate,
  manualOverrides,
  onForceQualify,
}: {
  matches: CompMatch[];
  teams: Record<string, Team>;
  onSimulate?: (matchId: string) => void;
  manualOverrides?: Record<string, string>;
  onForceQualify?: (leg1MatchId: string, teamId: string | null) => void;
}) {
  const leg1s = matches.filter((m) => m.leg === 1).sort((a, b) => {
    const ha = teams[a.homeTeamId ?? '']?.name ?? '';
    const hb = teams[b.homeTeamId ?? '']?.name ?? '';
    return ha.localeCompare(hb);
  });

  const leg2s = matches.filter((m) => m.leg === 2);

  const pairs: LPMPair[] = leg1s.map((leg1) => {
    // Try homeFromMatch first (pre-seed state), then match by teams (post-seed)
    const leg2 = leg2s.find((m) => m.homeFromMatch === leg1.id)
      ?? leg2s.find((m) =>
        m.homeTeamId && m.awayTeamId &&
        leg1.homeTeamId && leg1.awayTeamId &&
        ((m.homeTeamId === leg1.awayTeamId && m.awayTeamId === leg1.homeTeamId) ||
         (m.homeTeamId === leg1.homeTeamId && m.awayTeamId === leg1.awayTeamId))
      );
    return { leg1, leg2 };
  });

  return (
    <div className="space-y-3">
      {pairs.map(({ leg1, leg2 }, i) => (
        <LPMPairCard
          key={leg1.id}
          index={i + 1}
          leg1={leg1}
          leg2={leg2}
          teams={teams}
          onSimulate={onSimulate}
          manualOverrides={manualOverrides}
          onForceQualify={onForceQualify}
        />
      ))}
    </div>
  );
}

function LPMPairCard({
  index, leg1, leg2, teams, onSimulate, manualOverrides, onForceQualify,
}: {
  index: number;
  leg1: CompMatch;
  leg2: CompMatch | undefined;
  teams: Record<string, Team>;
  onSimulate?: (matchId: string) => void;
  manualOverrides?: Record<string, string>;
  onForceQualify?: (leg1MatchId: string, teamId: string | null) => void;
}) {
  const lower = leg1.homeTeamId ? teams[leg1.homeTeamId] : null;  // reçoit à l'aller
  const higher = leg1.awayTeamId ? teams[leg1.awayTeamId] : null; // reçoit au retour
  const tbd = !leg1.homeTeamId && !leg1.awayTeamId;

  // Agrégat
  const l1h = leg1.result?.home ?? 0;
  const l1a = leg1.result?.away ?? 0;
  const l2h = leg2?.result?.home ?? 0;
  const l2a = leg2?.result?.away ?? 0;
  const leg1Done = leg1.status === 'completed';
  const leg2Done = leg2?.status === 'completed';
  const bothDone = leg1Done && leg2Done;

  const aggHigher = l1a + l2h;
  const aggLower = l1h + l2a;

  const isManual = !!manualOverrides?.[leg1.id];
  const qualifiedId = resolveLPMPlayoffQualifier(leg1, leg2, manualOverrides);

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-bg px-4 py-2 text-xs text-muted uppercase tracking-wide">
        <span>Barrage {index}</span>
        {qualifiedId && (
          <span className={`font-medium normal-case ${isManual ? 'text-accent' : 'text-green-400'}`}>
            ✓ {teams[qualifiedId]?.name ?? '?'} qualifié{isManual ? ' (forcé)' : ''}
          </span>
        )}
      </div>

      {tbd ? (
        <div className="px-4 py-4 text-sm text-muted italic">Équipes à définir après les journées</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted border-b border-border/50">
              <th className="px-4 py-1.5 text-left">Équipe</th>
              <th className="px-3 py-1.5 text-center w-16">Aller</th>
              <th className="px-3 py-1.5 text-center w-16">Retour</th>
              <th className="px-3 py-1.5 text-center w-20 font-bold text-text">Cumul</th>
              <th className="px-3 py-1.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {/* Lower seed — leg1 home, leg2 away */}
            <LPMTeamRow
              team={lower}
              leg1Score={leg1Done ? l1h : undefined}
              leg2Score={leg2Done ? l2a : undefined}
              agg={leg1Done ? aggLower : undefined}
              qualified={qualifiedId === leg1.homeTeamId}
              bothDone={bothDone}
            />
            {/* Higher seed — leg1 away, leg2 home */}
            <LPMTeamRow
              team={higher}
              leg1Score={leg1Done ? l1a : undefined}
              leg2Score={leg2Done ? l2h : undefined}
              agg={leg1Done ? aggHigher : undefined}
              qualified={qualifiedId === leg1.awayTeamId}
              bothDone={bothDone}
            />
          </tbody>
        </table>
      )}

      {/* Simulate buttons */}
      {onSimulate && !tbd && (
        <div className="flex gap-3 border-t border-border/50 px-4 py-2">
          {leg1.status === 'pending' && (
            <button onClick={() => onSimulate(leg1.id)} className="text-xs text-accent hover:text-accent/70 transition-colors">
              ▶ Simuler aller
            </button>
          )}
          {leg2 && leg1Done && leg2.status === 'pending' && (
            <button onClick={() => onSimulate(leg2.id)} className="text-xs text-accent hover:text-accent/70 transition-colors">
              ▶ Simuler retour
            </button>
          )}
        </div>
      )}

      {/* Manual qualifier override (admin) */}
      {onForceQualify && !tbd && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/50 px-4 py-2">
          <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">Forcer qualifié</span>
          {leg1.homeTeamId && (
            <button
              onClick={() => onForceQualify(leg1.id, qualifiedId === leg1.homeTeamId && isManual ? null : leg1.homeTeamId!)}
              className={`text-xs transition-colors ${qualifiedId === leg1.homeTeamId && isManual ? 'text-accent font-medium' : 'text-muted hover:text-accent'}`}
            >
              {qualifiedId === leg1.homeTeamId && isManual ? '✓ ' : ''}{teams[leg1.homeTeamId]?.name ?? '?'}
            </button>
          )}
          {leg1.awayTeamId && (
            <button
              onClick={() => onForceQualify(leg1.id, qualifiedId === leg1.awayTeamId && isManual ? null : leg1.awayTeamId!)}
              className={`text-xs transition-colors ${qualifiedId === leg1.awayTeamId && isManual ? 'text-accent font-medium' : 'text-muted hover:text-accent'}`}
            >
              {qualifiedId === leg1.awayTeamId && isManual ? '✓ ' : ''}{teams[leg1.awayTeamId]?.name ?? '?'}
            </button>
          )}
          {isManual && (
            <button onClick={() => onForceQualify(leg1.id, null)} className="text-xs text-danger hover:text-danger/70 transition-colors">
              Annuler le forçage
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LPMTeamRow({
  team, leg1Score, leg2Score, agg, qualified, bothDone,
}: {
  team: Team | null;
  leg1Score?: number;
  leg2Score?: number;
  agg?: number;
  qualified: boolean;
  bothDone: boolean;
}) {
  return (
    <tr className={`border-t border-border/30 ${qualified ? 'bg-green-500/5' : ''}`}>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {team?.flag && <img src={team.flag} alt="" className="h-5 w-5 object-cover rounded-sm shrink-0" />}
          <span className={`truncate max-w-[140px] ${qualified ? 'font-medium text-green-400' : ''}`}>
            {team?.name ?? 'À définir'}
          </span>
          {qualified && <span className="text-[10px] rounded border border-green-500/40 bg-green-500/10 px-1 text-green-400 shrink-0">Qualifié</span>}
        </div>
      </td>
      <td className="px-3 py-2 text-center tabular-nums text-muted">
        {leg1Score !== undefined ? leg1Score : '—'}
      </td>
      <td className="px-3 py-2 text-center tabular-nums text-muted">
        {leg2Score !== undefined ? leg2Score : '—'}
      </td>
      <td className={`px-3 py-2 text-center tabular-nums font-bold ${bothDone && qualified ? 'text-green-400' : ''}`}>
        {agg !== undefined ? agg : '—'}
      </td>
      <td className="px-3 py-2" />
    </tr>
  );
}

type Props = {
  matches: CompMatch[];
  teams: Record<string, Team>;
  onSimulate?: (matchId: string) => void;
};

const PHASE_ORDER: Record<string, number> = {
  R64: 0, R32: 1, R16: 2, QF: 3, SF: 4, '3rd': 5, F: 6,
};

const PHASE_LABEL: Record<string, string> = {
  R64: '32ème', R32: '16ème', R16: '8ème', QF: 'Quarts', SF: 'Demies', '3rd': '3ème place', F: 'Finale',
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
