import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { useCredentials } from '@/stores/credentials';
import { useSession } from '@/stores/session';
import { validatePat } from '@/lib/github/api';

export default function Settings() {
  const session = useSession((s) => s.session);
  const logout = useSession((s) => s.logout);
  const githubPat = useCredentials((s) => s.githubPat);
  const setPat = useCredentials((s) => s.setPat);
  const navigate = useNavigate();
  const [draft, setDraft] = useState(githubPat ?? '');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const ok = await validatePat(draft.trim());
      if (!ok) {
        toast('error', 'Token GitHub invalide.');
        return;
      }
      setPat(draft.trim());
      toast('success', 'Token GitHub enregistré.');
    } catch (err) {
      toast('error', String(err));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPat(null);
    setDraft('');
    toast('info', 'Token GitHub effacé.');
  }

  function disconnect() {
    logout();
    setPat(null);
    navigate('/', { replace: true });
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 font-display text-4xl">Réglages</h1>
        <p className="text-muted">
          Configure les credentials nécessaires à la persistance des données.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          {session?.avatar ? (
            <img
              alt=""
              src={`https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}.png?size=64`}
              className="h-12 w-12 rounded-full border border-border"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-border" />
          )}
          <div>
            <div className="font-medium">{session?.username}</div>
            <div className="text-xs text-muted">Discord ID {session?.id}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={disconnect}>
          Se déconnecter
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl">Token GitHub</h2>
        <p className="text-sm text-muted">
          Personal Access Token avec scope <code className="rounded bg-border/40 px-1">repo</code>.
          Stocké uniquement dans ton navigateur.
        </p>
        <div className="flex gap-2">
          <Input
            type={reveal ? 'text' : 'password'}
            placeholder="ghp_..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button variant="ghost" onClick={() => setReveal((r) => !r)}>
            {reveal ? 'Masquer' : 'Afficher'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy || !draft.trim()}>
            {busy ? <Spinner className="mr-2" /> : null}
            Enregistrer
          </Button>
          <Button variant="ghost" onClick={clear} disabled={!githubPat}>
            Effacer
          </Button>
        </div>
        {githubPat ? <p className="text-xs text-accent">Token enregistré et validé.</p> : null}
      </section>
    </div>
  );
}
