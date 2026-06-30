import { env } from '@/lib/env';

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

// A hung fetch (dropped connection, failed CORS preflight that never settles, backend
// stuck mid-request) never resolves or rejects on its own — every save/load button that
// awaits this stayed in its loading state forever. Force it to fail after a fixed window
// so callers' catch/finally always run.
const REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${env.prApiUrl}/footsim${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Requête expirée après ${REQUEST_TIMEOUT_MS / 1000}s (${method} ${path})`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  const json = (await res.json()) as { success: boolean; data?: T; error?: string; message?: string };
  if (!json.success) throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

export const prapi = {
  get: <T>(path: string, token: string | null) => request<T>('GET', path, token),
  post: <T>(path: string, token: string | null, body: unknown) => request<T>('POST', path, token, body),
  put: <T>(path: string, token: string | null, body: unknown) => request<T>('PUT', path, token, body),
  del: <T>(path: string, token: string | null) => request<T>('DELETE', path, token),

  /** CMF rankings computed server-side — no auth required. */
  rankings: (page = 1, perPage = 100) =>
    request<{
      teams: {
        team: import('@/lib/types').Team;
        points: number;
        wins: number;
        finals: number;
        thirds: number;
        participations: number;
        form: ('W' | 'D' | 'L')[];
      }[];
      players: {
        id: string;
        firstName: string;
        lastName: string;
        position: string;
        overall: number;
        teamSlug: string;
        teamName: string;
      }[];
      topScorers: {
        id: string;
        playerName: string;
        position: string;
        overall: number;
        teamName: string;
        teamSlug: string;
        teamFlag: string;
        goals: number;
        assists: number;
      }[];
      topAssists: {
        id: string;
        playerName: string;
        position: string;
        overall: number;
        teamName: string;
        teamSlug: string;
        teamFlag: string;
        goals: number;
        assists: number;
      }[];
      pagination: { page: number; per_page: number; total: number; pages: number };
    }>('GET', `/rankings?page=${page}&per_page=${perPage}`, null),

  /** Top players paginated — no auth required. */
  rankingsPlayers: (page = 1, perPage = 50, position?: string, teamSlug?: string) => {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (position) qs.set('position', position);
    if (teamSlug) qs.set('team_slug', teamSlug);
    return request<{
      players: {
        id: string; firstName: string; lastName: string;
        position: string; overall: number;
        teamSlug: string; teamName: string; teamFlag: string | null; culture: string | null;
      }[];
      pagination: { page: number; per_page: number; total: number; pages: number };
    }>('GET', `/rankings/players?${qs}`, null);
  },

  /** Top scorers (goals from official matches) — paginated, no auth required. */
  rankingsScorers: (page = 1, perPage = 50, position?: string, teamSlug?: string) => {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (position) qs.set('position', position);
    if (teamSlug) qs.set('team_slug', teamSlug);
    return request<{
      players: { id: string; playerName: string; position: string; overall: number; teamName: string; teamSlug: string; teamFlag: string; goals: number; assists: number }[];
      pagination: { page: number; per_page: number; total: number; pages: number };
    }>('GET', `/rankings/scorers?${qs}`, null);
  },

  /** Top assisters (assists from official matches) — paginated, no auth required. */
  rankingsAssisters: (page = 1, perPage = 50, position?: string, teamSlug?: string) => {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (position) qs.set('position', position);
    if (teamSlug) qs.set('team_slug', teamSlug);
    return request<{
      players: { id: string; playerName: string; position: string; overall: number; teamName: string; teamSlug: string; teamFlag: string; goals: number; assists: number }[];
      pagination: { page: number; per_page: number; total: number; pages: number };
    }>('GET', `/rankings/assisters?${qs}`, null);
  },

  /** Players + formation for one team — for expanded ranking detail. No auth required. */
  rankingsTeamLineup: (slug: string) =>
    request<{
      players: import('@/lib/types').Player[];
      formation: import('@/lib/types').Formation;
      formationLabel?: string;
      lineup?: string[];
      tokenPositions?: Record<string, { x: number; y: number }>;
    }>('GET', `/rankings/teams/${slug}/lineup`, null),

  /** Upload a flag data URL to R2. Returns the CDN URL. */
  uploadFlag: (slug: string, dataUrl: string, token: string) =>
    request<{ url: string }>('POST', '/upload-flag', token, { slug, dataUrl }),

  /** Return the team+players managed by the authenticated user. */
  myTeam: (token: string) =>
    request<{ team: import('@/lib/types').Team; players: import('@/lib/types').Player[] }>('GET', '/teams/me', token),

  /** Exchange a Discord access_token for a FootSim JWT. */
  exchangeDiscordToken: (discordToken: string) =>
    request<{
      token: string;
      discord_id: string;
      username: string;
      avatar: string | null;
      is_admin: boolean;
    }>('POST', '/auth/discord/exchange', null, { access_token: discordToken }),
};
