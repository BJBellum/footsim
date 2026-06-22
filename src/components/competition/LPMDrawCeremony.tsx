import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Team } from '@/lib/types';

export type LPMPair = { home: string; away: string };

type Props = {
  pairs: LPMPair[];
  teams: Team[];
  title: string;
  subtitle?: string;
  pairLabels?: (i: number) => string;
  onConfirm: () => void;
};

export function LPMDrawCeremony({ pairs, teams, title, subtitle, pairLabels, onConfirm }: Props) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const total = pairs.length;

  const [revealed, setRevealed] = useState(0); // 0..total — index of next match to reveal
  const [spotlight, setSpotlight] = useState<LPMPair | null>(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function scrollToBottom() {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  function revealOne(idx: number, delay: number, cb?: () => void) {
    if (idx >= total) { setDone(true); setSpotlight(null); cb?.(); return; }
    const pair = pairs[idx];
    setSpotlight(pair);
    timerRef.current = setTimeout(() => {
      setSpotlight(null);
      setRevealed(idx + 1);
      scrollToBottom();
      timerRef.current = setTimeout(() => cb ? cb() : undefined, delay * 0.25);
    }, delay);
  }

  function handleRevealNext() {
    if (done || spotlight) return;
    revealOne(revealed, 1800);
  }

  function handleAuto() {
    if (timerRef.current) clearTimeout(timerRef.current);
    let idx = revealed;
    function step() {
      revealOne(idx, 700, () => {
        idx++;
        if (idx < total) timerRef.current = setTimeout(step, 100);
      });
    }
    step();
  }

  function handleSkip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSpotlight(null);
    setRevealed(total);
    setDone(true);
  }

  const spotHome = spotlight ? teamMap.get(spotlight.home) : null;
  const spotAway = spotlight ? teamMap.get(spotlight.away) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>

      {/* Spotlight */}
      <div className="min-h-[88px]">
        <AnimatePresence mode="wait">
          {spotlight && spotHome && spotAway ? (
            <motion.div
              key={`${spotlight.home}-${spotlight.away}`}
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-center gap-4 rounded-xl border border-accent/40 bg-accent/5 px-5 py-4 shadow-lg"
            >
              {/* Home */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                {spotHome.flag && <img src={spotHome.flag} alt="" className="h-10 w-10 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <div className="font-display text-lg truncate">{spotHome.name}</div>
                  <div className="text-xs text-accent">Domicile · {spotHome.globalStrength}</div>
                </div>
              </div>
              <div className="text-muted font-display text-sm shrink-0">vs</div>
              {/* Away */}
              <div className="flex flex-1 items-center gap-3 min-w-0 flex-row-reverse text-right">
                {spotAway.flag && <img src={spotAway.flag} alt="" className="h-10 w-10 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <div className="font-display text-lg truncate">{spotAway.name}</div>
                  <div className="text-xs text-warning">Extérieur · {spotAway.globalStrength}</div>
                </div>
              </div>
            </motion.div>
          ) : !done ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-[88px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted"
            >
              {revealed === 0 ? 'Appuie sur "Tirer" pour commencer' : `${revealed} / ${total} tirés — prêt pour le suivant…`}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Revealed list */}
      <div
        ref={listRef}
        className="rounded-lg border border-border bg-surface overflow-y-auto max-h-[340px]"
      >
        {revealed === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted/50 italic">Aucun match tiré</div>
        ) : (
          <div className="divide-y divide-border/40">
            {pairs.slice(0, revealed).map((pair, i) => {
              const home = teamMap.get(pair.home);
              const away = teamMap.get(pair.away);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-xs text-muted/50 w-6 shrink-0 tabular-nums text-right">{i + 1}.</span>
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {home?.flag && <img src={home.flag} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />}
                    <span className="truncate font-medium">{home?.name ?? pair.home}</span>
                  </div>
                  <span className="text-xs text-muted shrink-0">vs</span>
                  <div className="flex flex-1 items-center gap-2 min-w-0 flex-row-reverse text-right">
                    {away?.flag && <img src={away.flag} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />}
                    <span className="truncate">{away?.name ?? pair.away}</span>
                  </div>
                  <span className="text-xs text-muted/40 shrink-0 tabular-nums">
                    {pairLabels ? pairLabels(i) : `M${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(revealed / total) * 100}%` }} />
        </div>
        <span className="text-xs text-muted tabular-nums shrink-0">{revealed} / {total}</span>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        {!done ? (
          <>
            <Button onClick={handleRevealNext} disabled={!!spotlight} size="lg">
              {revealed === 0 ? 'Commencer le tirage' : `Tirer match ${revealed + 1}`}
            </Button>
            <Button onClick={handleAuto} variant="ghost" size="lg" disabled={!!spotlight}>
              ⚡ Auto
            </Button>
            <button onClick={handleSkip} className="text-xs text-muted/50 hover:text-muted transition-colors">
              Passer tout
            </button>
          </>
        ) : (
          <Button onClick={onConfirm} size="lg">
            Confirmer le tirage →
          </Button>
        )}
      </div>
    </div>
  );
}
