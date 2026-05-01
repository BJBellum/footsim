import { AnimatePresence, motion } from 'framer-motion';
import type { Team } from '@/lib/types';

type Props = {
  visible: boolean;
  scoringTeam: Team | null;
  home: Team;
  away: Team;
  score: { home: number; away: number };
};

export function GoalCelebration({ visible, scoringTeam, home, away, score }: Props) {
  return (
    <AnimatePresence>
      {visible && scoringTeam && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.97) 100%)' }}
        >
          <motion.div
            className="flex flex-col items-center gap-6 text-center"
            initial={{ scale: 0.4, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.6, y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <motion.div
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1.2, 1.1, 1.1, 1] }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-8xl select-none"
            >
              ⚽
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-7xl tracking-widest text-white uppercase"
            >
              BUT !
            </motion.div>

            {scoringTeam.flag && (
              <motion.img
                src={scoringTeam.flag}
                alt={scoringTeam.name}
                className="h-16 w-16 object-cover rounded"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              />
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="font-display text-2xl text-accent"
            >
              {scoringTeam.name}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 200 }}
              className="font-display text-6xl tabular-nums text-white"
            >
              {score.home} – {score.away}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-sm text-white/50 tracking-widest uppercase"
            >
              {home.name} · {away.name}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
