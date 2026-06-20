import type { CorruptionDeal } from './types';

export type CorruptionOffer = {
  /** Ref's demanded bribe in millions */
  amount: number;
  /** Probability ref actually honors the deal in-game */
  honorProb: number;
  /** Flavour text from referee */
  message: string;
};

const REF_MESSAGES = [
  "Je peux... regarder ailleurs ce soir. Mais ça a un prix.",
  "Les décisions se prennent sur le terrain... ou ailleurs.",
  "Vous voulez gagner ? Tout le monde a un prix.",
  "Pour la bonne somme, je peux oublier certaines fautes.",
  "L'arbitre voit tout. Sauf quand il est bien payé.",
  "Je ne garantis rien. Mais mes sifflets ont une mémoire sélective.",
  "Une enveloppe sous la table change beaucoup de choses.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 65% chance the referee makes an offer at all.
 * Returns null if he doesn't approach.
 */
export function generateRefOffer(): CorruptionOffer | null {
  if (Math.random() > 0.65) return null;
  const amount = Math.round((0.5 + Math.random() * 9.5) * 10) / 10; // 0.5M–10M
  // Higher bribe = more reliable, but never 100%
  const honorProb = 0.45 + (amount / 10) * 0.40; // 0.45–0.85
  return {
    amount,
    honorProb,
    message: pick(REF_MESSAGES),
  };
}

/**
 * Build a CorruptionDeal from an accepted offer.
 * Determines whether the ref will honor it (computed at deal time, revealed post-match).
 */
export function acceptOffer(side: 'home' | 'away', offer: CorruptionOffer): CorruptionDeal {
  return {
    side,
    bribe: offer.amount,
    accepted: true,
    honored: Math.random() < offer.honorProb,
  };
}

/** 10% chance of post-match revelation. */
export function isRevealed(): boolean {
  return Math.random() < 0.10;
}
