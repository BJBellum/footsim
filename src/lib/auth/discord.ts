import { env } from '@/lib/env';

export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
};

export type Session = {
  id: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  expiresAt: number;
};

export function buildDiscordAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.discordClientId,
    redirect_uri: env.discordRedirectUri,
    response_type: 'token',
    scope: 'identify',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function parseTokenFragment(
  fragment: string,
): { accessToken: string; expiresIn: number } | null {
  if (!fragment) return null;
  const cleaned = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const params = new URLSearchParams(cleaned);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (!accessToken || !expiresIn) return null;
  return { accessToken, expiresIn: Number(expiresIn) };
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}`);
  return (await res.json()) as DiscordUser;
}

export function isAdminId(id: string): boolean {
  return id === env.adminDiscordId;
}

export function getAvatarUrl(userId: string, avatarHash: string | null, size = 128): string {
  if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/0.png`;
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}
