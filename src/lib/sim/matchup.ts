import type { Formation, TacticStyle, CustomTacticStyle } from '@/lib/types';
import type { TacticMods } from './types';

type FormationProfile = 'high-press' | 'balanced' | 'midfield-heavy' | 'defensive-block';

function formationProfile(f: Formation): FormationProfile {
  if (['4-3-3', '3-4-3', '4-2-3-1'].includes(f)) return 'high-press';
  if (['5-3-2', '5-4-1', '4-5-1', '3-4-1-2'].includes(f)) return 'defensive-block';
  if (['3-5-2', '4-3-2-1', '3-6-1'].includes(f)) return 'midfield-heavy';
  return 'balanced'; // 4-4-2, 4-4-1-1, 4-1-4-1
}

/**
 * Formation matchup table.
 * Returns [myAttackMult, myDefenseMult, myMidfieldMult] for `my` formation vs `opp` formation.
 * Values are centered around 1.0 with ±5–10% range.
 */
const FORMATION_MATCHUP: Record<FormationProfile, Record<FormationProfile, [number, number, number]>> = {
  // [attackMult, defenseMult, midfieldMult]
  'high-press': {
    'high-press':      [1.00, 1.00, 1.00],
    'balanced':        [1.05, 0.97, 1.03],
    'midfield-heavy':  [0.93, 0.97, 0.95], // milieu surchargé étouffe le press
    'defensive-block': [0.92, 1.08, 1.02], // bloc bas casse les espaces du press
  },
  'balanced': {
    'high-press':      [0.97, 1.03, 0.97],
    'balanced':        [1.00, 1.00, 1.00],
    'midfield-heavy':  [0.96, 1.02, 0.98],
    'defensive-block': [1.02, 1.02, 1.00],
  },
  'midfield-heavy': {
    'high-press':      [1.05, 1.03, 1.07], // récupère mieux face au press
    'balanced':        [1.02, 1.00, 1.04],
    'midfield-heavy':  [1.00, 1.00, 1.00],
    'defensive-block': [1.04, 0.98, 1.06], // possession étouffe le bloc
  },
  'defensive-block': {
    'high-press':      [1.06, 0.95, 0.98], // contre-attaque sur espaces laissés
    'balanced':        [0.98, 1.02, 1.00],
    'midfield-heavy':  [0.96, 1.02, 0.96], // possession finit par percer
    'defensive-block': [1.00, 1.00, 1.00],
  },
};

type StyleProfile = 'possession-build' | 'direct-attack' | 'high-intensity' | 'defensive' | 'chaos';

function styleProfile(style: TacticStyle): StyleProfile {
  if (['possession', 'tiki-taka'].includes(style)) return 'possession-build';
  if (['contre-attaque', 'direct', 'long-ball'].includes(style)) return 'direct-attack';
  if (['pressing', 'gegenpressing'].includes(style)) return 'high-intensity';
  if (style === 'ultra-defensif') return 'defensive';
  return 'chaos';
}

/**
 * Style matchup table.
 * Returns [myAttackMult, myDefenseMult, myMidfieldMult] for `my` style vs `opp` style.
 *
 * Logique football :
 * - possession bat defensive (lentement étouffe le bloc)
 * - direct/long-ball bat possession (espace derrière ligne haute)
 * - high-intensity bat direct (récupération haute avant que le ballon parte)
 * - high-intensity perd contre possession (triangles courts absorbent le press)
 * - defensive résiste à direct/chaos (organisation ferme)
 * - chaos désorganise possession/tiki-taka (pressing anarchique)
 */
const STYLE_MATCHUP: Record<StyleProfile, Record<StyleProfile, [number, number, number]>> = {
  'possession-build': {
    'possession-build': [1.00, 1.00, 1.00],
    'direct-attack':    [0.94, 0.97, 1.02], // espace derrière → vulnérable
    'high-intensity':   [1.06, 1.04, 1.05], // triangles courts absorbent le press
    'defensive':        [1.08, 1.02, 1.06], // possession perce progressivement
    'chaos':            [0.95, 0.97, 1.00], // chaos déstabilise les patterns
  },
  'direct-attack': {
    'possession-build': [1.07, 1.02, 0.97], // exploit espace derrière ligne haute
    'direct-attack':    [1.00, 1.00, 1.00],
    'high-intensity':   [0.94, 0.96, 0.95], // récupération haute coupe les longs ballons
    'defensive':        [0.92, 1.00, 0.95], // bloc organisé ferme les espaces
    'chaos':            [1.02, 0.98, 0.97],
  },
  'high-intensity': {
    'possession-build': [0.95, 0.97, 0.96], // triangles courts cassent le press
    'direct-attack':    [1.06, 1.04, 1.05], // récupère avant le long ballon
    'high-intensity':   [1.00, 1.00, 1.00],
    'defensive':        [1.02, 0.98, 1.02], // pressing fatigue le bloc
    'chaos':            [0.97, 0.98, 0.98], // chaos désorganise l'organisation du press
  },
  'defensive': {
    'possession-build': [0.94, 1.00, 0.96], // possession finit par percer
    'direct-attack':    [1.06, 1.05, 0.98], // bloc bas absorbe les longs ballons
    'high-intensity':   [0.98, 1.02, 0.97],
    'defensive':        [1.00, 1.00, 1.00],
    'chaos':            [1.04, 1.03, 0.97], // organisation résiste au chaos
  },
  'chaos': {
    'possession-build': [1.05, 1.02, 1.00], // désorganise les circuits de passe
    'direct-attack':    [0.98, 1.02, 1.00],
    'high-intensity':   [1.02, 1.02, 1.00],
    'defensive':        [0.97, 0.98, 1.00], // bloc organisé résiste
    'chaos':            [1.00, 1.00, 1.00],
  },
};

/**
 * Derive a StyleProfile from CustomTacticStyle mods when no named style exists.
 * Uses dominant multiplier to classify.
 */
function customStyleProfile(mods: TacticMods): StyleProfile {
  const { shotFreqMult, midfieldMult, attackMult, defenseMult, foulRateMult } = mods;
  if (defenseMult >= 1.12) return 'defensive';
  if (foulRateMult >= 1.15 && midfieldMult >= 1.10) return 'high-intensity';
  if (midfieldMult >= 1.12) return 'possession-build';
  if (shotFreqMult >= 1.15 || attackMult >= 1.10) return 'direct-attack';
  if (foulRateMult >= 1.25 || shotFreqMult >= 1.25) return 'chaos';
  return 'balanced' as unknown as StyleProfile; // falls back to neutral
}

function resolveStyleProfile(
  tacticStyle?: TacticStyle,
  customTacticStyle?: CustomTacticStyle,
): StyleProfile | null {
  if (customTacticStyle) return customStyleProfile(customTacticStyle.mods);
  if (tacticStyle) return styleProfile(tacticStyle);
  return null;
}

export type MatchupAdjustment = {
  attackMult: number;
  defenseMult: number;
  midfieldMult: number;
};

/**
 * Compute cross-side matchup multipliers for one side.
 * Combines formation matchup + style matchup.
 * Each layer contributes independently; combined by multiplication.
 * Total swing stays bounded (both layers ±10% max = ±20% combined edge).
 */
export function computeMatchupAdjustment(
  myFormation: Formation,
  oppFormation: Formation,
  myTacticStyle?: TacticStyle,
  myCustomTacticStyle?: CustomTacticStyle,
  oppTacticStyle?: TacticStyle,
  oppCustomTacticStyle?: CustomTacticStyle,
): MatchupAdjustment {
  const myFP = formationProfile(myFormation);
  const oppFP = formationProfile(oppFormation);
  const [fAtt, fDef, fMid] = FORMATION_MATCHUP[myFP][oppFP];

  const mySP = resolveStyleProfile(myTacticStyle, myCustomTacticStyle);
  const oppSP = resolveStyleProfile(oppTacticStyle, oppCustomTacticStyle);

  let sAtt = 1.0, sDef = 1.0, sMid = 1.0;
  if (mySP && oppSP && mySP !== ('balanced' as StyleProfile) && oppSP !== ('balanced' as StyleProfile)) {
    [sAtt, sDef, sMid] = STYLE_MATCHUP[mySP as StyleProfile][oppSP as StyleProfile];
  } else if (mySP && oppSP) {
    // one side has no dominant style — partial influence (50%)
    const raw = (mySP !== ('balanced' as StyleProfile))
      ? STYLE_MATCHUP[mySP as StyleProfile][oppSP as StyleProfile]
      : STYLE_MATCHUP[oppSP as StyleProfile][mySP as StyleProfile];
    sAtt  = 1 + (raw[0] - 1) * 0.5;
    sDef  = 1 + (raw[1] - 1) * 0.5;
    sMid  = 1 + (raw[2] - 1) * 0.5;
  }

  return {
    attackMult:  fAtt * sAtt,
    defenseMult: fDef * sDef,
    midfieldMult: fMid * sMid,
  };
}
