/** Morale system — per-team value 1–100 tracked across a competition. */

export const MORALE_DEFAULT = 50;

function clamp(n: number, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

/**
 * Update morale for both sides after a match result.
 * Win: +5 to +9 (bigger wins give more).
 * Draw: ±0 to +1.
 * Loss: -4 to -8 (bigger losses hurt more).
 * Effect is intentionally small — morale is a flavour modifier, not a game-decider.
 */
export function updateMorale(
  current: Record<string, number>,
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
): Record<string, number> {
  const next = { ...current };
  if (!(homeId in next)) next[homeId] = MORALE_DEFAULT;
  if (!(awayId in next)) next[awayId] = MORALE_DEFAULT;

  const diff = homeGoals - awayGoals;

  // B: dampen losses when morale is already low (resilience floor)
  function applyMalus(id: string, raw: number) {
    const cur = next[id];
    // Below 30: malus reduced proportionally (at morale=1, only 20% of malus applies)
    const dampened = cur < 30 ? Math.round(raw * (0.2 + 0.8 * (cur / 30))) : raw;
    next[id] = clamp(cur - dampened);
  }

  if (diff > 0) {
    const bonus = Math.min(9, 5 + Math.floor(diff / 2));
    const malus = Math.min(8, 4 + Math.floor(diff / 2));
    next[homeId] = clamp(next[homeId] + bonus);
    applyMalus(awayId, malus);
  } else if (diff < 0) {
    const bonus = Math.min(9, 5 + Math.floor(-diff / 2));
    const malus = Math.min(8, 4 + Math.floor(-diff / 2));
    next[awayId] = clamp(next[awayId] + bonus);
    applyMalus(homeId, malus);
  } else {
    next[homeId] = clamp(next[homeId] + 1);
    next[awayId] = clamp(next[awayId] + 1);
  }

  return next;
}

/**
 * Init morale map for a new competition (all teams start at 50).
 */
export function initMorale(teamIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of teamIds) out[id] = MORALE_DEFAULT;
  return out;
}

/**
 * Translate morale (1–100) to a multiplier for attack/defense/midfield.
 * High morale (>50): up to +5% (unchanged).
 * Low morale (<30): asymmetric resilience boost — teams in crisis get a small
 * pride/desperation bonus, so the curve never punishes them as hard as it rewards the top.
 * Range effective: ~0.97–1.05.
 */
export function moraleMult(morale: number): number {
  if (morale >= 50) {
    // 50→100 maps to 1.00→1.05
    return 1 + ((morale - 50) / 50) * 0.05;
  } else if (morale >= 30) {
    // 30→50 maps to 0.98→1.00
    return 1 - ((50 - morale) / 20) * 0.02;
  } else {
    // <30: resilience kick — curve flattens and partially reverses
    // morale=30 → 0.98, morale=1 → 0.97 (instead of continuing down to 0.95)
    return 0.97 + ((morale - 1) / 29) * 0.01;
  }
}

export function moraleLabel(morale: number): { text: string; color: string } {
  if (morale >= 85) return { text: 'Excellent', color: 'text-green-400' };
  if (morale >= 70) return { text: 'Bon', color: 'text-green-300' };
  if (morale >= 55) return { text: 'Correct', color: 'text-muted' };
  if (morale >= 40) return { text: 'Fragile', color: 'text-warning' };
  if (morale >= 25) return { text: 'Bas', color: 'text-orange-400' };
  return { text: 'En crise', color: 'text-danger' };
}
