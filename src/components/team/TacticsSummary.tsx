import type { Player, TeamTactics } from '@/lib/types';
import { POSITION_LABEL, TACTIC_STYLE_LABEL } from '@/lib/types';

type Props = {
  tactics: TeamTactics;
  players: Player[];
};

export function TacticsSummary({ tactics, players }: Props) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const lineup = tactics.lineup.map((id) => playerMap.get(id)).filter(Boolean) as Player[];
  const activeCustomStyle = tactics.activeCustomStyleId
    ? tactics.customStyles?.find((s) => s.id === tactics.activeCustomStyleId)
    : undefined;

  const formationDisplay = tactics.formationLabel ?? tactics.formation;
  const styleDisplay = activeCustomStyle
    ? `🎨 ${activeCustomStyle.name}`
    : TACTIC_STYLE_LABEL[tactics.style] ?? tactics.style;

  // group lineup by zone for display
  const gk = lineup.filter((p) => p.position === 'GK');
  const def = lineup.filter((p) => ['CB', 'LB', 'RB'].includes(p.position));
  const mid = lineup.filter((p) => ['DM', 'CM', 'AM', 'LM', 'RM'].includes(p.position));
  const att = lineup.filter((p) => ['LW', 'RW', 'ST'].includes(p.position));

  const groups = [
    { label: 'ATT', players: att },
    { label: 'MID', players: mid },
    { label: 'DEF', players: def },
    { label: 'GK', players: gk },
  ].filter((g) => g.players.length > 0);

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-bold text-accent text-xl">{formationDisplay}</span>
        <span className="text-sm text-muted">{styleDisplay}</span>
        {lineup.length < 11 && (
          <span className="text-xs text-warning">Compo incomplète ({lineup.length}/11)</span>
        )}
      </div>

      {/* Lineup by zone */}
      {lineup.length > 0 && (
        <div className="space-y-1.5">
          {groups.map((g) => (
            <div key={g.label} className="flex items-start gap-2">
              <span className="w-8 shrink-0 text-[10px] font-bold text-muted uppercase pt-0.5">{g.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.players.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded bg-border/40 px-2 py-0.5 text-xs"
                    title={`${p.firstName} ${p.lastName} · ${p.position} · ${p.overall}`}
                  >
                    <span className="text-muted text-[10px]">{POSITION_LABEL[p.position]}</span>
                    <span>{p.lastName}</span>
                    <span className="text-muted text-[10px]">{p.overall}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {lineup.length === 0 && (
        <p className="text-xs text-muted">Aucun 11 sauvegardé.</p>
      )}
    </div>
  );
}
