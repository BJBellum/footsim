import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { generateRefOffer, acceptOffer, type CorruptionOffer } from '@/lib/sim/corruption';
import type { CorruptionDeal } from '@/lib/sim/types';

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  deal: CorruptionDeal | null;
  onDeal: (d: CorruptionDeal | null) => void;
};

export function CorruptionPanel({ homeTeamName, awayTeamName, deal, onDeal }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [offer, setOffer] = useState<CorruptionOffer | null>(null);
  const [contacted, setContacted] = useState(false);
  const [refused, setRefused] = useState(false);

  function contactRef() {
    const o = generateRefOffer();
    setContacted(true);
    setOffer(o);
    setRefused(!o);
  }

  function accept() {
    if (!offer) return;
    onDeal(acceptOffer(side, offer));
  }

  function decline() {
    setOffer(null);
    setContacted(false);
    setRefused(false);
    onDeal(null);
  }

  function toggle(v: boolean) {
    setEnabled(v);
    if (!v) {
      setOffer(null);
      setContacted(false);
      setRefused(false);
      onDeal(null);
    }
  }

  return (
    <section className="rounded-lg border border-danger/30 bg-danger/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-danger">⚠ Corruption arbitrale</div>
          <div className="text-xs text-muted mt-0.5">Risque de révélation post-match (10%). Disqualification.</div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
            className="h-4 w-4"
          />
          Activer
        </label>
      </div>

      {enabled && !deal && (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted mb-1">Équipe qui corrompt</div>
            <div className="flex gap-2">
              {(['home', 'away'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    side === s ? 'border-danger bg-danger/10 text-danger' : 'border-border hover:border-border/70'
                  }`}
                >
                  {s === 'home' ? homeTeamName : awayTeamName}
                </button>
              ))}
            </div>
          </div>

          {!contacted && (
            <Button size="sm" variant="ghost" onClick={contactRef} className="border-danger/40 text-danger hover:bg-danger/10">
              Contacter l'arbitre
            </Button>
          )}

          {contacted && refused && (
            <div className="rounded-md bg-surface border border-border p-3 text-sm text-muted italic">
              L'arbitre n'est pas intéressé. Intégrité respectée.
            </div>
          )}

          {contacted && offer && (
            <div className="rounded-md bg-surface border border-warning/30 p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-warning">Proposition de l'arbitre</div>
              <p className="text-sm italic text-muted">"{offer.message}"</p>
              <div className="text-sm font-medium">
                Montant demandé : <span className="text-warning">{offer.amount}M€</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={accept}>Accepter</Button>
                <Button size="sm" variant="ghost" onClick={decline}>Refuser</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {deal && (
        <div className="rounded-md bg-surface border border-danger/20 p-3 space-y-1">
          <div className="text-sm font-medium text-danger">Deal actif</div>
          <div className="text-xs text-muted">
            {deal.side === 'home' ? homeTeamName : awayTeamName} a versé{' '}
            <span className="font-medium text-warning">{deal.bribe}M€</span>.
            L'arbitre a promis de favoriser ce match.
          </div>
          <button
            onClick={() => { onDeal(null); setOffer(null); setContacted(false); setRefused(false); }}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Annuler le deal
          </button>
        </div>
      )}
    </section>
  );
}
