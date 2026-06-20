import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Team } from '@/lib/types';
import type { DrawResult, Pot } from '@/lib/competition/draw';
import { POT_COLORS } from '@/lib/competition/draw';

type Props = {
  result: DrawResult;
  teams: Team[];
  groupCount: number;
  onConfirm: (groups: Record<string, string[]>) => void;
};

const GROUP_NAMES = 'ABCDEFGHIJKLMNOP'.split('');

export function DrawCeremony({ result, teams, groupCount, onConfirm }: Props) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const groupKeys = Object.keys(result.groups).sort();

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function revealNext() {
    if (idx >= result.order.length) {
      setDone(true);
      setCurrent(null);
      return;
    }
    const teamId = result.order[idx];
    setCurrent(teamId);
    setIdx((i) => i + 1);
    timerRef.current = setTimeout(() => {
      setRevealed((prev) => new Set([...prev, teamId]));
      setCurrent(null);
    }, 1400);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const potOfTeam = (teamId: string): Pot | undefined =>
    result.pots.find((p) => p.teamIds.includes(teamId));

  const groupOfTeam = (teamId: string): number =>
    groupKeys.findIndex((k) => result.groups[k].includes(teamId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pot legend */}
        {result.pots.map((p) => (
          <div key={p.number} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: POT_COLORS[p.number] }}
            />
            Chapeau {p.number}
          </div>
        ))}
      </div>

      {/* Suspense reveal ball */}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current}
            initial={{ scale: 0.4, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-lg"
          >
            {(() => {
              const t = teamMap.get(current);
              const pot = potOfTeam(current);
              const gIdx = groupOfTeam(current);
              return (
                <>
                  {t?.flag && <img src={t.flag} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div>
                    <div className="font-display text-2xl">{t?.name ?? current}</div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      {pot && (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: POT_COLORS[pot.number] }}
                        />
                      )}
                      {pot && `Chapeau ${pot.number}`}
                      {gIdx >= 0 && ` → Groupe ${GROUP_NAMES[gIdx]}`}
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(groupCount, 4)}, minmax(0,1fr))` }}>
        {groupKeys.map((gKey, gi) => (
          <div key={gKey} className="rounded-lg border border-border bg-surface p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">
              Groupe {GROUP_NAMES[gi]}
            </div>
            <div className="space-y-1">
              {result.groups[gKey].map((tid) => {
                const t = teamMap.get(tid);
                const pot = potOfTeam(tid);
                const isRevealed = revealed.has(tid);
                const isCurrent = current === tid;
                return (
                  <motion.div
                    key={tid}
                    layout
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-all ${
                      isCurrent ? 'ring-1 ring-accent bg-accent/10' : ''
                    }`}
                  >
                    <span
                      className="shrink-0 h-2 w-2 rounded-full"
                      style={{ background: pot ? POT_COLORS[pot.number] : 'transparent' }}
                    />
                    {isRevealed ? (
                      <>
                        {t?.flag && (
                          <img src={t.flag} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />
                        )}
                        <span className="truncate">{t?.name ?? tid}</span>
                        <span className="ml-auto text-xs text-muted tabular-nums">{t?.globalStrength}</span>
                      </>
                    ) : (
                      <span className="text-muted italic">
                        {isCurrent ? '…' : '—'}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!done && (
          <Button onClick={revealNext} disabled={!!current} size="lg">
            {idx === 0 ? 'Commencer le tirage' : `Tirer (${idx}/${result.order.length})`}
          </Button>
        )}
        {done && (
          <Button onClick={() => onConfirm(result.groups)} size="lg">
            Confirmer et créer la compétition
          </Button>
        )}
      </div>
    </div>
  );
}
