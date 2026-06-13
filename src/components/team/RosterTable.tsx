import { useMemo, useState, useRef, useEffect } from 'react';
import type { Player, Position } from '@/lib/types';
import { POSITIONS, POSITION_LABEL, POSITION_FULL } from '@/lib/types';

type SortKey = 'overall' | 'age' | 'lastName' | 'position';

type RosterProps = {
  players: Player[];
  onSelect?: (id: string) => void;
};

function PostesPopover({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-surface p-3 shadow-lg"
    >
      <div className="mb-2 text-xs uppercase tracking-widest text-muted">Postes</div>
      <div className="space-y-1">
        {POSITIONS.map((p) => (
          <div key={p} className="flex items-center gap-2 text-sm">
            <span className="w-10 rounded bg-border/40 px-1.5 py-0.5 text-center text-xs font-mono font-medium">
              {POSITION_LABEL[p]}
            </span>
            <span className="text-text/80">{POSITION_FULL[p]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RosterTable({ players, onSelect }: RosterProps) {
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortKey>('overall');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [showPostes, setShowPostes] = useState(false);

  const rows = useMemo(() => {
    const base = filter === 'ALL' ? players : players.filter((p) => p.position === filter);
    return [...base].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [players, filter, sort, dir]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Position | 'ALL')}
        >
          <option value="ALL">Tous postes</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]} — {POSITION_FULL[p]}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{rows.length} joueurs</span>
        <div className="relative ml-auto">
          <button
            onClick={() => setShowPostes((v) => !v)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          >
            Postes
          </button>
          {showPostes && <PostesPopover onClose={() => setShowPostes(false)} />}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-muted">
            <tr>
              {(['lastName', 'position', 'age', 'overall'] as SortKey[]).map((k) => (
                <th
                  key={k}
                  className="cursor-pointer px-4 py-2 font-medium"
                  onClick={() => {
                    if (sort === k) setDir(dir === 'asc' ? 'desc' : 'asc');
                    else { setSort(k); setDir(k === 'overall' ? 'desc' : 'asc'); }
                  }}
                >
                  {k === 'lastName' ? 'Nom' : k === 'position' ? 'Poste' : k === 'age' ? 'Âge' : 'Overall'}
                  {sort === k ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Pied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-border ${onSelect ? 'cursor-pointer hover:bg-border/30' : ''}`}
                onClick={() => onSelect?.(p.id)}
              >
                <td className="px-4 py-2">{p.firstName} {p.lastName}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-border/40 px-2 py-0.5 text-xs font-mono">
                    {POSITION_LABEL[p.position]}
                  </span>
                  {p.altPositions.length ? (
                    <span className="ml-2 text-xs text-muted">
                      {p.altPositions.map((pos) => POSITION_LABEL[pos]).join(', ')}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2">{p.age}</td>
                <td className="px-4 py-2 font-medium">{p.overall}</td>
                <td className="px-4 py-2 text-muted">
                  {p.preferredFoot === 'right' ? 'D' : p.preferredFoot === 'left' ? 'G' : 'D/G'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
