import { motion } from 'framer-motion';
import type { MatchState } from '@/lib/sim/types';
import type { Formation } from '@/lib/types';

type Props = {
  state: MatchState;
  homeFormation: Formation;
  awayFormation: Formation;
};

const FORMATION_POSITIONS: Record<Formation, Array<{ x: number; y: number }>> = {
  '4-3-3': [
    { x: 5, y: 25 },
    { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 18, y: 32 }, { x: 18, y: 42 },
    { x: 30, y: 12 }, { x: 30, y: 25 }, { x: 30, y: 38 },
    { x: 42, y: 8 }, { x: 45, y: 25 }, { x: 42, y: 42 },
  ],
  '4-4-2': [
    { x: 5, y: 25 },
    { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 18, y: 32 }, { x: 18, y: 42 },
    { x: 30, y: 8 }, { x: 30, y: 18 }, { x: 30, y: 32 }, { x: 30, y: 42 },
    { x: 42, y: 18 }, { x: 42, y: 32 },
  ],
  '3-5-2': [
    { x: 5, y: 25 },
    { x: 18, y: 12 }, { x: 18, y: 25 }, { x: 18, y: 38 },
    { x: 28, y: 8 }, { x: 28, y: 18 }, { x: 28, y: 25 }, { x: 28, y: 32 }, { x: 28, y: 42 },
    { x: 42, y: 18 }, { x: 42, y: 32 },
  ],
  '4-2-3-1': [
    { x: 5, y: 25 },
    { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 18, y: 32 }, { x: 18, y: 42 },
    { x: 28, y: 18 }, { x: 28, y: 32 },
    { x: 38, y: 10 }, { x: 38, y: 25 }, { x: 38, y: 40 },
    { x: 45, y: 25 },
  ],
  '5-3-2': [
    { x: 5, y: 25 },
    { x: 18, y: 5 }, { x: 18, y: 15 }, { x: 18, y: 25 }, { x: 18, y: 35 }, { x: 18, y: 45 },
    { x: 30, y: 12 }, { x: 30, y: 25 }, { x: 30, y: 38 },
    { x: 42, y: 18 }, { x: 42, y: 32 },
  ],
  '4-1-4-1': [
    { x: 5, y: 25 },
    { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 18, y: 32 }, { x: 18, y: 42 },
    { x: 26, y: 25 },
    { x: 35, y: 8 }, { x: 35, y: 18 }, { x: 35, y: 32 }, { x: 35, y: 42 },
    { x: 45, y: 25 },
  ],
  '3-4-3': [
    { x: 5, y: 25 },
    { x: 18, y: 12 }, { x: 18, y: 25 }, { x: 18, y: 38 },
    { x: 30, y: 8 }, { x: 30, y: 18 }, { x: 30, y: 32 }, { x: 30, y: 42 },
    { x: 42, y: 8 }, { x: 45, y: 25 }, { x: 42, y: 42 },
  ],
  '4-3-2-1': [
    { x: 5, y: 25 },
    { x: 18, y: 8 }, { x: 18, y: 18 }, { x: 18, y: 32 }, { x: 18, y: 42 },
    { x: 28, y: 12 }, { x: 28, y: 25 }, { x: 28, y: 38 },
    { x: 38, y: 18 }, { x: 38, y: 32 },
    { x: 45, y: 25 },
  ],
};

function mirror(p: { x: number; y: number }) {
  return { x: 100 - p.x, y: p.y };
}

export function Pitch({ state, homeFormation, awayFormation }: Props) {
  const homePositions = FORMATION_POSITIONS[homeFormation];
  const awayPositions = FORMATION_POSITIONS[awayFormation].map(mirror);

  return (
    <svg
      viewBox="0 0 100 50"
      className="w-full max-w-3xl rounded-lg border border-border shadow-subtle-md"
      style={{ background: 'var(--pitch)' }}
    >
      <rect x="0.5" y="0.5" width="99" height="49" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <line x1="50" y1="0.5" x2="50" y2="49.5" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <circle cx="50" cy="25" r="6" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <circle cx="50" cy="25" r="0.5" fill="var(--pitch-line)" />
      <rect x="0.5" y="13" width="14" height="24" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <rect x="85.5" y="13" width="14" height="24" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <rect x="0.5" y="18" width="6" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />
      <rect x="93.5" y="18" width="6" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.3" />

      {homePositions.slice(0, state.homeOnPitch.length).map((pos, i) => (
        <circle
          key={`h-${i}`}
          cx={pos.x}
          cy={pos.y}
          r="1.4"
          fill="#F4F0E6"
          stroke="#1A1A1A"
          strokeWidth="0.2"
          opacity="0.95"
        />
      ))}
      {awayPositions.slice(0, state.awayOnPitch.length).map((pos, i) => (
        <circle
          key={`a-${i}`}
          cx={pos.x}
          cy={pos.y}
          r="1.4"
          fill="#C73E3E"
          stroke="#1A1A1A"
          strokeWidth="0.2"
          opacity="0.95"
        />
      ))}

      <motion.circle
        r="1.1"
        fill="white"
        animate={{ cx: state.ball.x, cy: state.ball.y }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  );
}
