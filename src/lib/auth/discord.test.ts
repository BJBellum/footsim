import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    discordClientId: 'CLIENT123',
    discordRedirectUri: 'https://example.com/footsim/auth/callback',
    dataRepo: 'x/y',
    dataBranch: 'main',
    adminDiscordId: 'ADMIN_ID',
  },
}));

import { buildDiscordAuthUrl, parseTokenFragment, isAdminId } from './discord';

describe('buildDiscordAuthUrl', () => {
  it('produces a valid implicit-flow URL with identify scope', () => {
    const url = new URL(buildDiscordAuthUrl());
    expect(url.origin + url.pathname).toBe('https://discord.com/api/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('CLIENT123');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/footsim/auth/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe('identify');
  });
});

describe('parseTokenFragment', () => {
  it('extracts access_token and expires_in', () => {
    const result = parseTokenFragment(
      '#access_token=abc&token_type=Bearer&expires_in=604800',
    );
    expect(result).toEqual({ accessToken: 'abc', expiresIn: 604800 });
  });

  it('returns null when fragment is empty or missing token', () => {
    expect(parseTokenFragment('')).toBeNull();
    expect(parseTokenFragment('#token_type=Bearer')).toBeNull();
  });
});

describe('isAdminId', () => {
  it('matches the configured admin id', () => {
    expect(isAdminId('ADMIN_ID')).toBe(true);
    expect(isAdminId('OTHER')).toBe(false);
  });
});
