import { useSession } from '@/stores/session';
import { useCredentials } from '@/stores/credentials';

export function useBackendArgs() {
  const session = useSession((s) => s.session);
  const isAdmin = useSession((s) => s.isAdmin());
  const pat = useCredentials((s) => s.githubPat);

  const ownerId = session?.id ?? '';
  // Admin uses PAT for GitHub. Non-admin: if they configured a PAT, use GitHub too
  // (lets them sync tactics with the admin). Without PAT → IndexedDB.
  const effectivePat = pat ?? null;

  return { ownerId, pat: effectivePat, isAdmin };
}
