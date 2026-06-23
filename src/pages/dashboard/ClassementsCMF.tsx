import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { useCredentials } from '@/stores/credentials';
import { useBackendArgs } from '@/hooks/useBackendArgs';
import { listTeams, loadTeam } from '@/lib/github/store';
import { POSITION_LABEL, CULTURE_LABEL } from '@/lib/types';
import type { Team, Position } from '@/lib/types';
import type { CompHistoryEntry, CompetitionKind, CompetitionScope } from '@/lib/competition/types';
import type { RecentMatchSummary } from '@/lib/github/matches';

// ─── Points system ────────────────────────────────────────────────────────────

const RESULT_BASE: Record<CompHistoryEntry['result'], number> = {
  winner: 100,
  finalist: 60,
  third: 40,
  semi: 25,
  participant: 10,
};

const SCOPE_MULT: Record<CompetitionScope, number> = {
  internationale: 2.0,
  continentale: 1.6,
  nationale: 1.2,
  regionale: 1.0,
  autre: 0.8,
};

const KIND_MULT: Record<CompetitionKind, number> = {
  officielle: 1.5,
  amicale: 0.8,
};

function entryPoints(entry: CompHistoryEntry): number {
  const base = RESULT_BASE[entry.result] ?? 10;
  const scope = SCOPE_MULT[entry.scope ?? 'autre'];
  const kind = KIND_MULT[entry.kind ?? 'amicale'];
  return Math.round(base * scope * kind);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchResult = 'W' | 'D' | 'L';

type TeamRankEntry = {
  team: Team;
  points: number;
  wins: number;
  finals: number;
  thirds: number;
  participations: number;
  form: MatchResult[]; // last 5, most recent last
};

type PlayerEntry = {
  player: { id: string; firstName: string; lastName: string; position: string; overall: number };
  team: Team;
};

type Tab = 'equipes' | 'joueurs';

// ─── Result label ─────────────────────────────────────────────────────────────

const RESULT_LABEL: Record<CompHistoryEntry['result'], string> = {
  winner: 'Vainqueur',
  finalist: 'Finaliste',
  third: '3e place',
  semi: 'Demi-finale',
  participant: 'Participant',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassementsCMF() {
  const pat = useCredentials((s) => s.githubPat);
  const { pat: effectivePat } = useBackendArgs();
  const token = pat ?? effectivePat ?? null;

  const [tab, setTab] = useState<Tab>('equipes');
  const [loading, setLoading] = useState(true);
  const [teamEntries, setTeamEntries] = useState<TeamRankEntry[]>([]);
  const [playerEntries, setPlayerEntries] = useState<PlayerEntry[]>([]);

  // player filters
  const [posFilter, setPosFilter] = useState<string>('all');
  const [playerLimit, setPlayerLimit] = useState(50);

  useEffect(() => {
    async function load() {
      try {
        const teams = await listTeams(token);
        const rankEntries: TeamRankEntry[] = [];
        const players: PlayerEntry[] = [];

        await Promise.all(
          teams.map(async (team) => {
            const data = await loadTeam(team.slug, token);
            if (!data) return;

            // Players
            for (const p of data.players) {
              players.push({ player: p, team: data.team });
            }

            // Team points from compHistory
            const history = data.team.compHistory ?? [];
            let points = 0;
            let wins = 0, finals = 0, thirds = 0;
            for (const entry of history) {
              points += entryPoints(entry);
              if (entry.result === 'winner') wins++;
              else if (entry.result === 'finalist') finals++;
              else if (entry.result === 'third') thirds++;
            }

            // Form: last 5 matches most recent last
            const recent: RecentMatchSummary[] = data.team.recentMatches ?? [];
            const form: MatchResult[] = recent.slice(-5).map((m) =>
              m.scoreFor > m.scoreAgainst ? 'W' : m.scoreFor === m.scoreAgainst ? 'D' : 'L',
            );

            rankEntries.push({
              team: data.team,
              points,
              wins,
              finals,
              thirds,
              participations: history.length,
              form,
            });
          }),
        );

        rankEntries.sort((a, b) => b.points - a.points || b.wins - a.wins || b.finals - a.finals);
        players.sort((a, b) => b.player.overall - a.player.overall);

        setTeamEntries(rankEntries);
        setPlayerEntries(players);
      } catch (err) {
        toast('error', String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const positions = ['all', ...Array.from(new Set(playerEntries.map((e) => e.player.position)))];
  const filteredPlayers = posFilter === 'all'
    ? playerEntries
    : playerEntries.filter((e) => e.player.position === posFilter);
  const shownPlayers = filteredPlayers.slice(0, playerLimit);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl">Classements CMF</h1>
        <p className="mt-1 text-muted text-sm">
          Classements officiels de la Confédération Mondiale du Football.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['equipes', 'Meilleures équipes'], ['joueurs', 'Meilleurs joueurs']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'equipes' && (
        <TeamRanking entries={teamEntries} />
      )}

      {tab === 'joueurs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
            >
              <option value="all">Tous les postes</option>
              {positions.filter((p) => p !== 'all').map((p) => (
                <option key={p} value={p}>{POSITION_LABEL[p as keyof typeof POSITION_LABEL] ?? p}</option>
              ))}
            </select>
            <span className="text-xs text-muted">{filteredPlayers.length} joueurs</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg text-left text-xs text-muted uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-4 py-2">Joueur</th>
                  <th className="px-4 py-2">Poste</th>
                  <th className="px-4 py-2">Nationalité</th>
                  <th className="px-4 py-2">Culture</th>
                  <th className="px-3 py-2 text-right font-bold">OVR</th>
                </tr>
              </thead>
              <tbody>
                {shownPlayers.map((e, idx) => {
                  const { player, team } = e;
                  const rank = idx + 1;
                  const rankColor =
                    rank === 1 ? 'text-yellow-500 font-bold' :
                    rank === 2 ? 'text-zinc-400 font-bold' :
                    rank === 3 ? 'text-orange-500 font-bold' :
                    'text-muted';
                  return (
                    <tr key={player.id} className="border-t border-border hover:bg-border/10 transition-colors">
                      <td className={`px-3 py-2.5 text-center tabular-nums text-sm ${rankColor}`}>{rank}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{player.firstName} {player.lastName}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-border/40 px-2 py-0.5 font-mono text-xs">
                          {POSITION_LABEL[player.position as Position]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {team.flag && (
                            <img src={team.flag} alt="" className="h-5 w-5 rounded-sm object-cover shrink-0" />
                          )}
                          <span className="truncate max-w-[120px] text-sm">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted text-xs">
                        {CULTURE_LABEL[team.culture] ?? team.culture}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-accent">{player.overall}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length > playerLimit && (
            <div className="text-center">
              <button
                onClick={() => setPlayerLimit((l) => l + 50)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Afficher plus ({filteredPlayers.length - playerLimit} restants)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Form icons ───────────────────────────────────────────────────────────────

function FormIcon({ result }: { result: MatchResult }) {
  if (result === 'W') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Victoire">
        <polyline points="2,8 6,12 14,4" />
      </svg>
    );
  }
  if (result === 'L') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Défaite">
        <line x1="3" y1="3" x2="13" y2="13" />
        <line x1="13" y1="3" x2="3" y2="13" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 text-yellow-400 shrink-0" fill="currentColor" aria-label="Match nul">
      <rect x="2" y="7" width="12" height="2" rx="1" />
    </svg>
  );
}

// ─── Team ranking sub-component ───────────────────────────────────────────────

function TeamRanking({ entries }: { entries: TeamRankEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center text-muted">
        Aucune équipe avec historique de compétitions.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left text-xs text-muted uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 w-10 text-center">#</th>
            <th className="px-4 py-2">Équipe</th>
            <th className="px-3 py-2 text-center">🏆</th>
            <th className="px-3 py-2 text-center">🥈</th>
            <th className="px-3 py-2 text-center">🥉</th>
            <th className="px-3 py-2 text-center">Participations</th>
            <th className="px-3 py-2 text-center">Forme</th>
            <th className="px-3 py-2 text-right font-bold">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => {
            const rank = idx + 1;
            const rankColor =
              rank === 1 ? 'text-yellow-500 font-bold' :
              rank === 2 ? 'text-zinc-400 font-bold' :
              rank === 3 ? 'text-orange-500 font-bold' :
              'text-muted';
            const isOpen = expanded === e.team.id;
            const history = e.team.compHistory ?? [];

            return (
              <>
                <tr
                  key={e.team.id}
                  className="border-t border-border hover:bg-border/10 transition-colors cursor-pointer"
                  onClick={() => history.length > 0 && setExpanded(isOpen ? null : e.team.id)}
                >
                  <td className={`px-3 py-2.5 text-center tabular-nums text-sm ${rankColor}`}>{rank}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {e.team.flag && (
                        <img src={e.team.flag} alt="" className="h-6 w-6 rounded-sm object-cover shrink-0" />
                      )}
                      <span className="font-medium truncate">{e.team.name}</span>
                      {history.length > 0 && (
                        <span className="text-xs text-muted ml-1">{isOpen ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{e.wins || '—'}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{e.finals || '—'}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{e.thirds || '—'}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-muted">{e.participations}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-0.5">
                      {e.form.length === 0
                        ? <span className="text-xs text-muted">—</span>
                        : e.form.map((r, i) => <FormIcon key={i} result={r} />)
                      }
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-accent">{e.points}</td>
                </tr>
                {isOpen && (
                  <tr key={`${e.team.id}-detail`} className="border-t border-border bg-bg/50">
                    <td />
                    <td colSpan={6} className="px-4 py-3">
                      <div className="space-y-1">
                        {history.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-muted gap-4">
                            <span className="font-medium text-text truncate max-w-[200px]">{entry.compName}</span>
                            <span>{entry.year ?? '—'}</span>
                            <span className="capitalize">{entry.scope ?? 'autre'}</span>
                            <span>{entry.kind ?? 'amicale'}</span>
                            <span className="font-medium text-accent">{RESULT_LABEL[entry.result]}</span>
                            <span className="tabular-nums text-accent font-bold">+{entryPoints(entry)} pts</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
