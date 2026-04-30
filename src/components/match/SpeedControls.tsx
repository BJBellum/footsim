import { Button } from '@/components/ui/Button';
import type { Speed } from '@/lib/sim/types';

type Props = {
  speed: Speed;
  paused: boolean;
  finished: boolean;
  onSpeed: (s: Speed) => void;
  onPause: () => void;
  onResume: () => void;
};

const SPEEDS: Array<{ key: Speed; label: string }> = [
  { key: '0.5', label: '×0.5' },
  { key: '1', label: '×1' },
  { key: '2', label: '×2' },
  { key: '5', label: '×5' },
  { key: 'instant', label: 'Instant' },
];

export function SpeedControls({ speed, paused, finished, onSpeed, onPause, onResume }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 shadow-subtle-sm">
      {!finished &&
        (paused ? (
          <Button size="sm" onClick={onResume}>▶ Reprendre</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onPause}>⏸ Pause</Button>
        ))}
      <div className="mx-2 h-6 w-px bg-border" />
      {SPEEDS.map((s) => (
        <Button
          key={s.key}
          size="sm"
          variant={speed === s.key ? 'primary' : 'ghost'}
          onClick={() => onSpeed(s.key)}
          disabled={finished}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
