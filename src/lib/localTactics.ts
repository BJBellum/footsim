import type { TeamTactics } from '@/lib/types';

export function loadLocalTactics(teamId: string): TeamTactics | undefined {
  try {
    const raw = localStorage.getItem(`footsim.tactics.${teamId}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveLocalTactics(teamId: string, tactics: TeamTactics) {
  localStorage.setItem(`footsim.tactics.${teamId}`, JSON.stringify(tactics));
}
