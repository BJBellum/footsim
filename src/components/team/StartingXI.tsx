import { useMemo, useState } from 'react';
import { pickXI } from '@/lib/sim/lineup';
import { POSITION_LABEL } from '@/lib/types';
import type { Formation, Player } from '@/lib/types';

type Props = {
  players: Player[];
  formation: Formation;
  /** IDs du lineup custom (tactics.lineup) — si absent ou invalide → meilleur XI auto */
  lineup?: string[];
  /** If provided, shows a button to save the current auto XI as the active tactic */
  onSaveAutoXI?: (lineupIds: string[]) => Promise<void>;
};

export function StartingXI({ players, formation, lineup, onSaveAutoXI }: Props) {
  const [saving, setSaving] = useState(false);
  const hasCustom = !!(lineup && lineup.length === 11);

  const { starters, bench, isAuto } = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]));
    let starters: Player[];
    let bench: Player[];
    let isAuto = false;

    if (lineup && lineup.length === 11) {
      const resolved = lineup.map((id) => byId.get(id)).filter(Boolean) as Player[];
      if (resolved.length === 11) {
        starters = resolved;
        bench = players
          .filter((p) => !lineup.includes(p.id))
          .sort((a, b) => b.overall - a.overall)
          .slice(0, 12);
      } else {
        ({ lineup: starters, bench } = pickXI(players, formation));
        bench = bench.sort((a, b) => b.overall - a.overall).slice(0, 12);
        isAuto = true;
      }
    } else {
      ({ lineup: starters, bench } = pickXI(players, formation));
      bench = bench.sort((a, b) => b.overall - a.overall).slice(0, 12);
      isAuto = true;
    }

    return { starters, bench, isAuto };
  }, [players, formation, lineup]);

  return (
    <div className="space-y-4">
      {/* Source indicator + save button */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">
          {hasCustom && !isAuto ? '📋 XI tactique défini' : '⚡ Meilleur XI auto (par poste)'}
        </span>
        {isAuto && onSaveAutoXI && (
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await onSaveAutoXI(starters.map((p) => p.id)); }
              finally { setSaving(false); }
            }}
            className="px-2 py-0.5 rounded text-xs border border-border bg-surface hover:bg-border/40 transition-colors disabled:opacity-50"
          >
            {saving ? '…' : '↑ Figer & publier ce XI'}
          </button>
        )}
      </div>

      {/* XI titulaires */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="bg-bg px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted flex items-center justify-between">
          <span>XI titulaires · {formation}</span>
          <span className="text-accent font-mono">{starters.length}/11</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {starters.map((p, i) => (
              <tr key={p.id} className="border-t border-border hover:bg-border/10 transition-colors">
                <td className="w-8 px-3 py-2 text-center text-xs text-muted tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-border/40 px-1.5 py-0.5 font-mono text-xs">
                    {POSITION_LABEL[p.position]}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{p.firstName} {p.lastName}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-accent">{p.overall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Banc */}
      {bench.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="bg-bg px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
            Banc ({bench.length})
          </div>
          <table className="w-full text-sm">
            <tbody>
              {bench.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-border/10 transition-colors">
                  <td className="px-3 py-2">
                    <span className="rounded bg-border/40 px-1.5 py-0.5 font-mono text-xs">
                      {POSITION_LABEL[p.position]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text/80">{p.firstName} {p.lastName}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{p.overall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
