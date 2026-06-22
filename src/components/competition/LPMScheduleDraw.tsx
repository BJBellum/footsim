import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Competition } from '@/lib/competition/types';
import type { Team } from '@/lib/types';

type Props = {
  competition: Competition;
  teamMap: Record<string, Team>;
  onConfirm: () => void;
};

export function LPMScheduleDraw({ competition, teamMap, onConfirm }: Props) {
  // Build teamId → sorted list of opponent IDs (from league matches only)
  const opponentMap = buildOpponentMap(competition);
  const teamIds = competition.teamIds;

  const [teamIdx, setTeamIdx] = useState(0);          // which team we're revealing for
  const [revealedCount, setRevealedCount] = useState(0); // how many opponents revealed for current team
  const [done, setDone] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const currentTeamId = teamIds[teamIdx];
  const currentTeam = teamMap[currentTeamId];
  const opponents = opponentMap[currentTeamId] ?? [];
  const totalTeams = teamIds.length;

  function revealNextOpponent() {
    if (revealedCount < opponents.length) {
      setRevealedCount((c) => c + 1);
    } else {
      // Move to next team
      if (teamIdx + 1 < totalTeams) {
        setTeamIdx((i) => i + 1);
        setRevealedCount(0);
      } else {
        setDone(true);
        setAutoRunning(false);
      }
    }
  }

  function autoReveal() {
    setAutoRunning(true);
    function step() {
      setRevealedCount((c) => {
        const nextCount = c + 1;
        if (nextCount <= opponents.length) {
          timerRef.current = setTimeout(step, 120);
          return nextCount;
        } else {
          // move to next team
          setTeamIdx((ti) => {
            const nextTi = ti + 1;
            if (nextTi >= totalTeams) {
              setDone(true);
              setAutoRunning(false);
              return ti;
            }
            timerRef.current = setTimeout(() => {
              setRevealedCount(0);
              timerRef.current = setTimeout(step, 300);
            }, 300);
            return nextTi;
          });
          return 0;
        }
      });
    }
    timerRef.current = setTimeout(step, 120);
  }

  function skipAll() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoRunning(false);
    setTeamIdx(totalTeams - 1);
    const lastTeam = teamIds[totalTeams - 1];
    setRevealedCount((opponentMap[lastTeam] ?? []).length);
    setDone(true);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl">{competition.name}</h1>
        <p className="text-muted text-sm mt-1">
          Tirage du calendrier · {totalTeams} équipes · 11 journées
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((teamIdx + (revealedCount / (opponents.length || 1))) / totalTeams) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted shrink-0">
          {teamIdx + 1} / {totalTeams}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Current team spotlight */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTeamId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-xl border border-accent/40 bg-accent/5 p-5 space-y-3"
            >
              {currentTeam?.flag && (
                <img src={currentTeam.flag} alt="" className="h-16 w-16 rounded object-cover" />
              )}
              <div>
                <div className="font-display text-2xl">{currentTeam?.name ?? currentTeamId}</div>
                <div className="text-sm text-muted mt-0.5">
                  Force {currentTeam?.globalStrength} ·{' '}
                  {revealedCount < opponents.length
                    ? `${revealedCount} / ${opponents.length} adversaires`
                    : `Calendrier complet ✓`}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {!done && (
            <div className="flex flex-col gap-2">
              {!autoRunning && (
                <Button onClick={revealNextOpponent} size="lg" className="w-full">
                  {revealedCount === 0
                    ? `Tirer les adversaires →`
                    : revealedCount < opponents.length
                    ? `Adversaire ${revealedCount + 1} / ${opponents.length}`
                    : `Équipe suivante →`}
                </Button>
              )}
              <Button onClick={autoReveal} variant="ghost" size="sm" className="w-full" disabled={autoRunning}>
                ⚡ Auto
              </Button>
              <button onClick={skipAll} className="text-xs text-muted/50 hover:text-muted text-center transition-colors">
                Passer tout
              </button>
            </div>
          )}

          {done && (
            <Button onClick={onConfirm} size="lg" className="w-full">
              Lancer la compétition →
            </Button>
          )}
        </div>

        {/* Opponents list */}
        <div className="rounded-lg border border-border bg-surface p-4 space-y-2 min-h-[300px]">
          <div className="text-xs uppercase tracking-widest text-muted mb-3">
            Calendrier de {currentTeam?.name ?? '…'}
          </div>
          {opponents.map((oppId, i) => {
            const opp = teamMap[oppId];
            const isRevealed = i < revealedCount;
            const isCurrent = i === revealedCount - 1 && revealedCount > 0;
            return (
              <motion.div
                key={oppId}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                  isCurrent ? 'bg-accent/10 ring-1 ring-accent' : ''
                }`}
                animate={isCurrent ? { x: [0, 4, 0] } : {}}
                transition={{ duration: 0.25 }}
              >
                <span className="text-xs text-muted/50 w-5 shrink-0 tabular-nums">{i + 1}.</span>
                {isRevealed ? (
                  <>
                    {opp?.flag && (
                      <img src={opp.flag} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />
                    )}
                    <span className="truncate font-medium">{opp?.name ?? oppId}</span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{opp?.globalStrength}</span>
                  </>
                ) : (
                  <span className="text-muted/40 italic">—</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildOpponentMap(competition: Competition): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const teamId of competition.teamIds) {
    map[teamId] = [];
  }
  for (const m of competition.matches) {
    if (m.phase !== 'league') continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    if (map[m.homeTeamId]) map[m.homeTeamId].push(m.awayTeamId);
    if (map[m.awayTeamId]) map[m.awayTeamId].push(m.homeTeamId);
  }
  // Sort opponents by round order (they're already in round order from scheduler)
  return map;
}
