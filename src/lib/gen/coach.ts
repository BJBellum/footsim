import type { Culture } from '@/lib/types';
import { pickNameMixed } from './names';
import type { CultureWeight } from './names';

export type CoachTrait =
  | 'motivateur'      // +5% moral (attack mult)
  | 'tacticien'       // +8% midfield
  | 'offensif'        // +6% attack, -3% defense
  | 'defensif'        // +8% defense, -4% attack
  | 'disciplinaire'   // -30% foul rate
  | 'opportuniste'    // +10% shot freq
  | 'gestionnaire'    // bench quality bonus (+2 to sub overall avg)
  | 'charismatique';  // all stats +3%

export type CoachStats = {
  motivation: number;   // 1–20: attack bonus
  tactique: number;     // 1–20: midfield bonus
  offensive: number;    // 1–20: attack bonus
  defensif: number;     // 1–20: defense bonus
  mentalite: number;    // 1–20: foul rate reduction
  gestion: number;      // 1–20: sub quality bonus
};

export type Coach = {
  id: string;
  firstName: string;
  lastName: string;
  culture: Culture;
  stats: CoachStats;
  trait: CoachTrait;
  overall: number;
};

export type CoachBonuses = {
  attackMult: number;
  midfieldMult: number;
  defenseMult: number;
  shotFreqMult: number;
  foulRateMult: number;
};

const TRAITS: CoachTrait[] = [
  'motivateur', 'tacticien', 'offensif', 'defensif',
  'disciplinaire', 'opportuniste', 'gestionnaire', 'charismatique',
];

export const COACH_TRAIT_LABEL: Record<CoachTrait, string> = {
  motivateur: 'Motivateur',
  tacticien: 'Tacticien',
  offensif: 'Offensif',
  defensif: 'Défensif',
  disciplinaire: 'Disciplinaire',
  opportuniste: 'Opportuniste',
  gestionnaire: 'Gestionnaire',
  charismatique: 'Charismatique',
};

function sampleStat(): number {
  const r = Math.random();
  return Math.max(1, Math.min(20, Math.round(8 + r * 12)));
}

function computeOverall(stats: CoachStats): number {
  const avg = (stats.motivation + stats.tactique + stats.offensive + stats.defensif + stats.mentalite + stats.gestion) / 6;
  return Math.round(clamp(avg * 5, 1, 100));
}

function clamp(n: number, lo: number, hi: number) { return n < lo ? lo : n > hi ? hi : n; }

export function generateCoach(cultures: CultureWeight[]): Coach {
  const dominant = cultures.reduce((a, b) => (a.weight >= b.weight ? a : b)).culture;
  const { firstName, lastName } = pickNameMixed(cultures);
  const stats: CoachStats = {
    motivation: sampleStat(),
    tactique: sampleStat(),
    offensive: sampleStat(),
    defensif: sampleStat(),
    mentalite: sampleStat(),
    gestion: sampleStat(),
  };
  const trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
  return {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    culture: dominant,
    stats,
    trait,
    overall: computeOverall(stats),
  };
}

export function computeCoachBonuses(coach: Coach): CoachBonuses {
  const s = coach.stats;
  // Base bonuses from stats (each stat 1–20, mapped to small multipliers)
  const attackBonus = 1 + (s.motivation / 20) * 0.06 + (s.offensive / 20) * 0.08;
  const midfieldBonus = 1 + (s.tactique / 20) * 0.10;
  const defenseBonus = 1 + (s.defensif / 20) * 0.08;
  const shotBonus = 1 + (s.offensive / 20) * 0.04;
  const foulBonus = 1 - (s.mentalite / 20) * 0.10;

  // Trait modifiers on top
  switch (coach.trait) {
    case 'motivateur':
      return { attackMult: attackBonus * 1.05, midfieldMult: midfieldBonus, defenseMult: defenseBonus, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    case 'tacticien':
      return { attackMult: attackBonus, midfieldMult: midfieldBonus * 1.08, defenseMult: defenseBonus, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    case 'offensif':
      return { attackMult: attackBonus * 1.06, midfieldMult: midfieldBonus, defenseMult: defenseBonus * 0.97, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    case 'defensif':
      return { attackMult: attackBonus * 0.96, midfieldMult: midfieldBonus, defenseMult: defenseBonus * 1.08, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    case 'disciplinaire':
      return { attackMult: attackBonus, midfieldMult: midfieldBonus, defenseMult: defenseBonus, shotFreqMult: shotBonus, foulRateMult: foulBonus * 0.70 };
    case 'opportuniste':
      return { attackMult: attackBonus, midfieldMult: midfieldBonus, defenseMult: defenseBonus, shotFreqMult: shotBonus * 1.10, foulRateMult: foulBonus };
    case 'gestionnaire':
      return { attackMult: attackBonus, midfieldMult: midfieldBonus, defenseMult: defenseBonus, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    case 'charismatique':
      return { attackMult: attackBonus * 1.03, midfieldMult: midfieldBonus * 1.03, defenseMult: defenseBonus * 1.03, shotFreqMult: shotBonus, foulRateMult: foulBonus };
    default:
      return { attackMult: attackBonus, midfieldMult: midfieldBonus, defenseMult: defenseBonus, shotFreqMult: shotBonus, foulRateMult: foulBonus };
  }
}
