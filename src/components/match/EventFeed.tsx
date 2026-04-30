import { AnimatePresence, motion } from 'framer-motion';
import type { MatchEvent } from '@/lib/sim/types';

const accentByType: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'border-l-accent',
  yellow: 'border-l-warning',
  red: 'border-l-danger',
  save: 'border-l-accent/60',
  halftime: 'border-l-muted',
  fulltime: 'border-l-muted',
};

export function EventFeed({ events }: { events: MatchEvent[] }) {
  const recent = [...events].slice(-30).reverse();
  return (
    <div className="flex h-full max-h-[420px] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-subtle-sm">
      <h3 className="font-display text-sm uppercase tracking-widest text-muted">Événements</h3>
      <AnimatePresence initial={false}>
        {recent.map((ev) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={`border-l-2 ${accentByType[ev.type] ?? 'border-l-border'} pl-3 text-sm`}
          >
            {ev.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
