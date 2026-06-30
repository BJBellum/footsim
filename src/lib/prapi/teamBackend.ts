import type { Player, Team } from '@/lib/types';
import type { ITeamBackend } from '@/lib/backend';
import { prapi } from './client';

export class PrApiTeamBackend implements ITeamBackend {
  constructor(private token: string) {}

  async listTeams(_ownerId: string): Promise<Team[]> {
    return prapi.get<Team[]>('/teams', this.token);
  }

  async bulkTeams(slugs?: string[]): Promise<{ team: Team; players: Player[] }[]> {
    // POST with a body for slug lists — a long query string (15+ slugs) plus the
    // Authorization header on the CORS preflight has been observed failing before
    // the response comes back, which the browser reports as a CORS error.
    if (slugs && slugs.length > 0) {
      return prapi.post<{ team: Team; players: Player[] }[]>('/teams/bulk', this.token, { slugs });
    }
    return prapi.get<{ team: Team; players: Player[] }[]>('/teams/bulk', this.token);
  }

  async loadTeam(slug: string, _ownerId: string): Promise<{ team: Team; players: Player[] } | null> {
    try {
      return prapi.get<{ team: Team; players: Player[] }>(`/teams/${slug}`, this.token);
    } catch {
      return null;
    }
  }

  async saveTeam(team: Team, players: Player[]): Promise<Team> {
    let flagUrl = team.flag;
    if (flagUrl && flagUrl.startsWith('data:image/')) {
      const { url } = await prapi.uploadFlag(team.slug, flagUrl, this.token);
      flagUrl = url;
    }
    const savedTeam = { ...team, flag: flagUrl };
    await prapi.put(`/teams/${team.slug}`, this.token, { team: savedTeam, players });
    return savedTeam;
  }

  async bulkUpdateTeams(items: { slug: string; team: Team; players: Player[] }[]): Promise<void> {
    if (!items.length) return;
    await prapi.post('/teams/bulk-update', this.token, { teams: items });
  }

  async deleteTeam(slug: string, _ownerId: string): Promise<void> {
    await prapi.del(`/teams/${slug}`, this.token);
  }
}
