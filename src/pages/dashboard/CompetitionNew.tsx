import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { useTeams } from '@/stores/teams';
import { useCredentials } from '@/stores/credentials';
import { useCompetition } from '@/stores/competition';
import {
  generateLeagueMatches,
  generateCupBracket,
  generateGroupsKnockout,
  buildInitialStandings,
} from '@/lib/competition/scheduler';
import { FORMAT_LABEL, FORMAT_DESCRIPTION } from '@/lib/competition/types';
import type { CompetitionFormat, CompetitionConfig, Competition } from '@/lib/competition/types';
import type { MatchRules } from '@/lib/sim/types';
import { DEFAULT_RULES } from '@/lib/sim/types';

export default function CompetitionNew() {
  const teams = useTeams((s) => s.teams);
  const refresh = useTeams((s) => s.refresh);
  const save = useCompetition((s) => s.save);
  const pat = useCredentials((s) => s.githubPat);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [format, setFormat] = useState<CompetitionFormat>('league');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [legs, setLegs] = useState<1 | 2>(1);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [groupsCount, setGroupsCount] = useState(4);
  const [qualifyPerGroup, setQualifyPerGroup] = useState(2);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_RULES);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pat && teams.length === 0) refresh(pat);
  }, [pat, teams.length, refresh]);

  function toggleTeam(id: string) {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const minTeams = format === 'league' ? 3 : format === 'cup' ? 2 : groupsCount * 2;
  const valid = name.trim().length > 0 && selectedTeams.length >= minTeams && !!pat;

  async function create() {
    if (!valid || !pat) return;
    setBusy(true);
    try {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const config: CompetitionConfig = {
        legsPerMatch: legs,
        thirdPlaceMatch: thirdPlace,
        groupsCount: format === 'groups_knockout' ? groupsCount : undefined,
        qualifyPerGroup: format === 'groups_knockout' ? qualifyPerGroup : undefined,
        matchRules: rules,
      };

      let matches, groups;
      if (format === 'league') {
        matches = generateLeagueMatches(selectedTeams, legs);
        groups = undefined;
      } else if (format === 'cup') {
        matches = generateCupBracket(selectedTeams, legs, thirdPlace);
        groups = undefined;
      } else {
        const result = generateGroupsKnockout(
          selectedTeams, groupsCount, qualifyPerGroup, legs, thirdPlace,
        );
        matches = result.matches;
        groups = result.groups;
      }

      const comp: Competition = {
        id,
        name: name.trim(),
        format,
        teamIds: selectedTeams,
        matches,
        groups,
        standings: buildInitialStandings(selectedTeams),
        playerStats: {},
        config,
        currentRound: 1,
        status: 'ongoing',
        createdAt: new Date().toISOString(),
      };

      await save(comp, pat);
      toast('success', 'Compétition créée.');
      navigate(`/dashboard/competitions/${id}`);
    } catch (err) {
      toast('error', String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="mb-1 font-display text-4xl">Nouvelle compétition</h1>
        <p className="text-muted">Configure le format et les équipes participantes.</p>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="text-xs uppercase tracking-widest text-muted">Informations</div>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Nom de la compétition</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Coupe des Nations" />
        </label>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="text-xs uppercase tracking-widest text-muted">Format</div>
        <div className="grid gap-3">
          {(Object.keys(FORMAT_LABEL) as CompetitionFormat[]).map((f) => (
            <label
              key={f}
              className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                format === f ? 'border-accent bg-accent/5' : 'border-border hover:border-border/80'
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="mt-0.5 shrink-0"
              />
              <div>
                <div className="font-medium">{FORMAT_LABEL[f]}</div>
                <div className="text-sm text-muted">{FORMAT_DESCRIPTION[f]}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="text-xs uppercase tracking-widest text-muted">Options du format</div>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <select
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
            value={legs}
            onChange={(e) => setLegs(Number(e.target.value) as 1 | 2)}
          >
            <option value={1}>1 match aller</option>
            <option value={2}>2 matchs (aller-retour)</option>
          </select>
        </label>
        {format !== 'league' && (
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={thirdPlace}
              onChange={(e) => setThirdPlace(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Match pour la 3ème place
          </label>
        )}
        {format === 'groups_knockout' && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Nombre de groupes</span>
              <select
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                value={groupsCount}
                onChange={(e) => setGroupsCount(Number(e.target.value))}
              >
                {[2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>{n} groupes</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Équipes qualifiées par groupe</span>
              <select
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                value={qualifyPerGroup}
                onChange={(e) => setQualifyPerGroup(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'équipe' : 'équipes'}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="text-xs uppercase tracking-widest text-muted">Règles des matchs</div>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={rules.noOffside}
            onChange={(e) => setRules({ ...rules, noOffside: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Pas de hors-jeu
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Remplaçants max</span>
          <select
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
            value={rules.maxSubs}
            onChange={(e) => setRules({ ...rules, maxSubs: Number(e.target.value) as 3 | 5 })}
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={rules.extraTime}
            onChange={(e) => setRules({ ...rules, extraTime: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Prolongations
        </label>
        {rules.extraTime && (
          <label className="flex items-center gap-3 text-sm cursor-pointer pl-5">
            <input
              type="checkbox"
              checked={rules.goldenGoal}
              onChange={(e) => setRules({ ...rules, goldenGoal: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            But en or
          </label>
        )}
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={rules.penalties}
            onChange={(e) => setRules({ ...rules, penalties: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Tirs au but
        </label>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted">Équipes participantes</div>
          <span className="text-xs text-muted">{selectedTeams.length} sélectionnée{selectedTeams.length > 1 ? 's' : ''} · min {minTeams}</span>
        </div>
        <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
          {teams.map((team) => (
            <label
              key={team.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                selectedTeams.includes(team.id)
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border/70'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTeams.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
                className="h-4 w-4 shrink-0"
              />
              {team.flag && <img src={team.flag} alt="" className="h-8 w-8 object-cover rounded-sm shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{team.name}</div>
                <div className="text-xs text-muted">Force {team.globalStrength}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={create} size="lg" disabled={!valid || busy}>
          {busy && <Spinner className="mr-2" />}
          Créer la compétition
        </Button>
        {selectedTeams.length < minTeams && (
          <span className="text-sm text-muted">
            Sélectionne au moins {minTeams} équipes
          </span>
        )}
      </div>
    </div>
  );
}
