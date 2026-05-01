import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { RosterTable } from '@/components/team/RosterTable';
import { PlayerEdit } from '@/components/team/PlayerEdit';
import { TacticsPanel } from '@/components/team/TacticsPanel';
import type { Player, Team, TeamTactics } from '@/lib/types';
import { CULTURE_LABEL, CULTURES } from '@/lib/types';
import type { Culture } from '@/lib/types';
import { useCredentials } from '@/stores/credentials';
import { useTeams } from '@/stores/teams';
import type { CultureWeight } from '@/lib/gen/names';

const ADD_COUNTS = [100, 200, 500, 1000];

export default function TeamDetail() {
  const { slug = '' } = useParams();
  const pat = useCredentials((s) => s.githubPat);
  const fetchTeam = useTeams((s) => s.fetchTeam);
  const saveTeam = useTeams((s) => s.saveTeam);
  const removeTeam = useTeams((s) => s.removeTeam);
  const navigate = useNavigate();

  const [data, setData] = useState<{ team: Team; players: Player[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCount, setDeleteCount] = useState(1);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<'roster' | 'tactique' | 'noms'>('roster');
  const [nameWeights, setNameWeights] = useState<CultureWeight[]>([]);
  const [renamingAll, setRenamingAll] = useState(false);

  useEffect(() => {
    if (!pat) return;
    setLoading(true);
    fetchTeam(slug, pat)
      .then((res) => {
        if (!res) toast('error', 'Équipe introuvable.');
        setData(res);
      })
      .catch((err) => toast('error', String(err)))
      .finally(() => setLoading(false));
  }, [slug, pat, fetchTeam]);

  async function addPlayers(extra: number) {
    if (!data || !pat) return;
    setAdding(true);
    try {
      const { generatePlayers } = await import('@/lib/gen/players');
      const newPlayers = generatePlayers({
        count: extra,
        culture: data.team.culture,
        globalStrength: data.team.globalStrength,
      });
      const merged = [...data.players, ...newPlayers];
      const team = { ...data.team, playerCount: merged.length };
      await saveTeam(team, merged, pat);
      setData({ team, players: merged });
      toast('success', `+${extra} joueurs.`);
    } catch (err) {
      toast('error', String(err));
    } finally {
      setAdding(false);
    }
  }

  async function deleteWeakest(n: number) {
    if (!data || !pat || n <= 0) return;
    const sorted = [...data.players].sort((a, b) => a.overall - b.overall);
    const toRemove = new Set(sorted.slice(0, Math.min(n, sorted.length)).map((p) => p.id));
    const merged = data.players.filter((p) => !toRemove.has(p.id));
    const team = { ...data.team, playerCount: merged.length };
    try {
      await saveTeam(team, merged, pat);
      setData({ team, players: merged });
      toast('success', `${toRemove.size} joueur(s) supprimé(s).`);
    } catch (err) {
      toast('error', String(err));
    }
  }

  async function savePlayer(next: Player) {
    if (!data || !pat) return;
    const merged = data.players.map((p) => (p.id === next.id ? next : p));
    try {
      await saveTeam(data.team, merged, pat);
      setData({ team: data.team, players: merged });
      setEditingId(null);
      toast('success', 'Joueur mis à jour.');
    } catch (err) {
      toast('error', String(err));
    }
  }

  async function deletePlayer(id: string) {
    if (!data || !pat) return;
    const merged = data.players.filter((p) => p.id !== id);
    const team = { ...data.team, playerCount: merged.length };
    try {
      await saveTeam(team, merged, pat);
      setData({ team, players: merged });
      setEditingId(null);
      toast('success', 'Joueur supprimé.');
    } catch (err) {
      toast('error', String(err));
    }
  }

  async function renameAll() {
    if (!data || !pat || nameWeights.length === 0) return;
    const total = nameWeights.reduce((s, c) => s + c.weight, 0);
    if (total === 0) return;
    setRenamingAll(true);
    try {
      const { pickNameMixed } = await import('@/lib/gen/names');
      const renamed = data.players.map((p) => ({
        ...p,
        ...pickNameMixed(nameWeights),
      }));
      await saveTeam(data.team, renamed, pat);
      setData({ team: data.team, players: renamed });
      toast('success', `${renamed.length} noms régénérés.`);
    } catch (err) {
      toast('error', String(err));
    } finally {
      setRenamingAll(false);
    }
  }

  async function saveTactics(tactics: TeamTactics) {
    if (!data || !pat) return;
    const team = { ...data.team, tactics };
    try {
      await saveTeam(team, data.players, pat);
      setData({ team, players: data.players });
      toast('success', 'Tactique sauvegardée.');
    } catch (err) {
      toast('error', String(err));
    }
  }

  async function deleteTeamHandler() {
    if (!data || !pat) return;
    setDeleting(true);
    try {
      await removeTeam(data.team.slug, pat);
      toast('success', 'Équipe supprimée.');
      navigate('/dashboard/teams');
    } catch (err) {
      toast('error', String(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Chargement…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-danger">Équipe introuvable.</p>
        <Button variant="ghost" onClick={() => navigate('/dashboard/teams')}>
          Retour
        </Button>
      </div>
    );
  }

  const { team, players } = data;
  const editing = editingId ? players.find((p) => p.id === editingId) ?? null : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <img
          src={team.flag}
          alt=""
          className="h-24 w-24 object-cover"
        />
        <div className="space-y-1 flex-1">
          <h1 className="font-display text-4xl">{team.name}</h1>
          <p className="text-sm text-muted">
            {CULTURE_LABEL[team.culture]} · Force {team.globalStrength} ·{' '}
            {team.playerCount} joueurs · Formation {team.formation}
          </p>
        </div>
        <div>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={deleteTeamHandler} disabled={deleting}>
                {deleting ? <Spinner className="mr-2" /> : null}
                Confirmer suppression
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              Supprimer l’équipe
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {(['roster', 'noms', 'tactique'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-text'}`}
          >
            {t === 'roster' ? 'Roster' : t === 'noms' ? 'Noms' : 'Tactique'}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Roster</h2>
            <div className="flex flex-wrap items-center gap-2">
              {ADD_COUNTS.map((n) => (
                <Button key={n} variant="ghost" size="sm" onClick={() => addPlayers(n)} disabled={adding}>
                  + {n}
                </Button>
              ))}
              {adding ? <Spinner /> : null}
              <div className="flex items-center gap-1 border-l border-border pl-2">
                <input
                  type="number"
                  min={1}
                  max={players.length}
                  value={deleteCount}
                  onChange={(e) => setDeleteCount(Math.max(1, Number(e.target.value)))}
                  className="h-8 w-16 rounded border border-border bg-surface px-2 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteWeakest(deleteCount)}
                  disabled={adding || players.length === 0}
                >
                  Supprimer les plus faibles
                </Button>
              </div>
            </div>
          </div>
          <RosterTable players={players} onSelect={setEditingId} />
        </section>
      )}

      {tab === 'noms' && (
        <NameMixPanel
          weights={nameWeights}
          onChange={setNameWeights}
          onApply={renameAll}
          busy={renamingAll}
          playerCount={players.length}
        />
      )}

      {tab === 'tactique' && (
        <section className="space-y-4">
          <h2 className="font-display text-xl">Tactique</h2>
          <TacticsPanel team={team} players={players} onSave={saveTactics} />
        </section>
      )}

      <AnimatePresence>
        {editing ? (
          <PlayerEdit
            key={editing.id}
            player={editing}
            onClose={() => setEditingId(null)}
            onSave={savePlayer}
            onDelete={() => deletePlayer(editing.id)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NameMixPanel({
  weights,
  onChange,
  onApply,
  busy,
  playerCount,
}: {
  weights: CultureWeight[];
  onChange: (w: CultureWeight[]) => void;
  onApply: () => void;
  busy: boolean;
  playerCount: number;
}) {
  const selected = weights.map((w) => w.culture);
  const total = weights.reduce((s, c) => s + c.weight, 0);

  function toggleCulture(culture: Culture) {
    if (selected.includes(culture)) {
      onChange(weights.filter((w) => w.culture !== culture));
    } else {
      onChange([...weights, { culture, weight: 50 }]);
    }
  }

  function setWeight(culture: Culture, value: number) {
    onChange(weights.map((w) => (w.culture === culture ? { ...w, weight: value } : w)));
  }

  function distribute() {
    if (weights.length === 0) return;
    const equal = Math.round(100 / weights.length);
    onChange(weights.map((w, i) => ({ ...w, weight: i === weights.length - 1 ? 100 - equal * (weights.length - 1) : equal })));
  }

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-xl mb-1">Régénération des noms</h2>
        <p className="text-sm text-muted">
          Sélectionne une ou plusieurs cultures et définis leur part dans l'équipe. Les noms sont remplacés, les stats restent inchangées.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-muted">Cultures sélectionnées ({weights.length})</span>
          {weights.length > 1 && (
            <button onClick={distribute} className="text-xs text-accent hover:text-accent/70 transition-colors">
              Répartir également
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-60 overflow-y-auto pr-1">
          {CULTURES.map((c) => {
            const active = selected.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCulture(c)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-border/70'
                }`}
              >
                {CULTURE_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      {weights.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-widest text-muted">Proportions</div>
          {weights.map((cw) => {
            const pct = total > 0 ? Math.round((cw.weight / total) * 100) : 0;
            return (
              <div key={cw.culture} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{CULTURE_LABEL[cw.culture]}</span>
                  <span className="text-accent font-medium tabular-nums">{pct}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={cw.weight}
                  onChange={(e) => setWeight(cw.culture, Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            );
          })}
          <div className="pt-1 text-xs text-muted">
            {weights.map((cw) => {
              const pct = total > 0 ? Math.round((cw.weight / total) * 100) : 0;
              return `${CULTURE_LABEL[cw.culture]} ${pct}%`;
            }).join(' · ')}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={onApply}
          disabled={busy || weights.length === 0 || playerCount === 0}
          size="lg"
        >
          {busy && <Spinner className="mr-2" />}
          Régénérer les {playerCount} noms
        </Button>
        {weights.length === 0 && (
          <span className="text-sm text-muted">Sélectionne au moins une culture</span>
        )}
      </div>
    </section>
  );
}
