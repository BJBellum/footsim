import type { Formation, Player } from '@/lib/types';
import type { SideRatings } from './types';
import { pickXI } from './lineup';

export function precomputeSide(roster: Player[], formation: Formation): SideRatings {
  const { lineup, bench } = pickXI(roster, formation);

  const gk = lineup.find((p) => p.position === 'GK');
  const def = lineup.filter((p) => ['CB', 'LB', 'RB'].includes(p.position));
  const mid = lineup.filter((p) => ['DM', 'CM', 'AM', 'LM', 'RM'].includes(p.position));
  const att = lineup.filter((p) => ['LW', 'RW', 'ST'].includes(p.position));

  const top3Att = [...att].sort((a, b) => b.overall - a.overall).slice(0, 3);
  const am = mid.filter((p) => p.position === 'AM');

  const meanAtt = top3Att.length ? avg(top3Att.map((p) => p.overall)) : 50;
  const meanAm = am.length ? avg(am.map((p) => p.overall)) : meanAtt;
  const attack = 0.7 * meanAtt + 0.3 * meanAm;

  const midfield = mid.length ? avg(mid.map((p) => p.overall)) : 50;
  const defense = (def.length ? avg(def.map((p) => p.overall)) : 50) * 0.8 + (gk?.overall ?? 50) * 0.2;
  const gkRating = gk?.overall ?? 50;

  return {
    attack,
    midfield,
    defense,
    gk: gkRating,
    formation,
    lineup: lineup.map((p) => p.id),
    bench: bench.map((p) => p.id),
    yellow: new Set(),
    red: new Set(),
  };
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
