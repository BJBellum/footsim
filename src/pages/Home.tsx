import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buildDiscordAuthUrl } from '@/lib/auth/discord';
import { useSession } from '@/stores/session';
import { useTeams } from '@/stores/teams';
import { useBackendArgs } from '@/hooks/useBackendArgs';

export default function Home() {
  const isLoggedIn = useSession((s) => s.isLoggedIn());
  const isAdmin = useSession((s) => s.isAdmin());
  const session = useSession((s) => s.session);
  const teamsStore = useTeams((s) => s.teams);
  const refreshTeams = useTeams((s) => s.refresh);
  const { ownerId, pat } = useBackendArgs();
  const navigate = useNavigate();

  // If connected non-admin manager → redirect to /my-team
  useEffect(() => {
    if (!isLoggedIn || isAdmin || !session) return;
    async function checkManager() {
      if (teamsStore.length === 0) await refreshTeams(ownerId, pat);
      const mine = useTeams.getState().teams.find((t) => t.managerDiscordId === session!.id);
      if (mine) navigate('/my-team', { replace: true });
    }
    checkManager();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin, session?.id]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.h1
        className="font-display text-6xl tracking-tight md:text-7xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        FootSim
      </motion.h1>
      <motion.p
        className="max-w-xl text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Simulez le football du Projet Résurgence. Créez vos équipes, générez vos rosters,
        faites s'affronter les nations.
      </motion.p>
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        {isLoggedIn ? (
          <>
            {isAdmin && <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>}
            {isAdmin && (
              <Link to="/match">
                <Button variant="ghost">Lancer un match</Button>
              </Link>
            )}
            {!isAdmin && (
              <Button onClick={() => navigate('/my-team')}>Mon équipe</Button>
            )}
          </>
        ) : (
          <a href={buildDiscordAuthUrl()}>
            <Button>Connexion Discord</Button>
          </a>
        )}
      </motion.div>
    </main>
  );
}
