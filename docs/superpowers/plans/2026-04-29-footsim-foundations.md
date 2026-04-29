# FootSim — Plan 1 : Fondations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the FootSim app with Vite/React/TS/Tailwind, set up routing and design tokens, implement Discord OAuth implicit flow with admin gate, GitHub PAT settings, and the GitHub Pages deploy workflow.

**Architecture:** Static SPA built with Vite + React 18 + TypeScript. State managed via Zustand stores (`session`). Styling via Tailwind with CSS custom properties matching the design tokens. Discord OAuth uses the implicit grant; a single Discord ID (`772821169664426025`) is treated as admin and is the only account allowed past `/dashboard/*` and `/match/*`. GitHub access uses a user-supplied PAT stored in localStorage. Deployed by GitHub Actions to GitHub Pages.

**Tech Stack:** Vite, React 18, TypeScript, React Router v6, Zustand, Tailwind CSS, shadcn/ui primitives, Framer Motion, Vitest, GitHub Actions.

---

## File Structure (Plan 1)

```
footsim/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
├── .github/workflows/pages.yml
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── styles/globals.css
│   ├── lib/
│   │   ├── env.ts
│   │   ├── auth/discord.ts
│   │   ├── auth/discord.test.ts
│   │   ├── github/api.ts
│   │   └── github/api.test.ts
│   ├── stores/
│   │   └── session.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Spinner.tsx
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   └── auth/
│   │       └── RequireAdmin.tsx
│   └── pages/
│       ├── Home.tsx
│       ├── auth/Callback.tsx
│       ├── NoAccess.tsx
│       ├── dashboard/Dashboard.tsx
│       └── dashboard/Settings.tsx
└── tests/
    └── setup.ts
```

---

## Task 1 : Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Initialise pnpm + Vite scaffold**

```bash
cd /Users/bejnamin/Desktop/FootSim
pnpm create vite@latest . --template react-ts -- --no-git
```

When prompted "Current directory is not empty", choose **Ignore files and continue**.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
pnpm add react-router-dom zustand framer-motion clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer @types/node vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui
```

- [ ] **Step 3: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/footsim/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 4: Update `tsconfig.json` paths**

Add to `compilerOptions`:

```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

- [ ] **Step 5: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Replace `index.html` head**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/footsim/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@1,500;1,600;1,700&display=swap" rel="stylesheet" />
    <title>FootSim</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Run dev server smoke test**

```bash
pnpm dev
```

Expected: Vite starts, default page renders at `http://localhost:5173/footsim/`. Stop server (Ctrl+C).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project"
```

---

## Task 2 : Tailwind + design tokens

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/styles/globals.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        'subtle-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'subtle-md': '0 6px 24px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Replace `src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #FAFAF8;
  --surface: #FFFFFF;
  --text: #1A1A1A;
  --muted: #8A8A85;
  --border: #E8E6E1;
  --accent: #1F8B4C;
  --danger: #C73E3E;
  --warning: #D9A93C;
}

html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-display { font-family: 'Fraunces', serif; font-style: italic; }

::selection { background: var(--accent); color: white; }

button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Update `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Replace `src/App.tsx` (temporary)**

```tsx
export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="font-display text-5xl">FootSim</h1>
    </main>
  );
}
```

- [ ] **Step 6: Verify**

```bash
pnpm dev
```

Expected: page renders with Fraunces italic "FootSim" centered on off-white background. Stop server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(style): add Tailwind config with design tokens"
```

---

## Task 3 : Utility components (Button, Input, Spinner, Toast)

**Files:**
- Create: `src/lib/cn.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Spinner.tsx`, `src/components/ui/Toast.tsx`

- [ ] **Step 1: Create `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create `src/components/ui/Button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  ghost: 'bg-transparent text-text hover:bg-border/60',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
});
```

- [ ] **Step 3: Create `src/components/ui/Input.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent',
        className,
      )}
      {...rest}
    />
  );
});
```

- [ ] **Step 4: Create `src/components/ui/Spinner.tsx`**

```tsx
import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent',
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}
```

- [ ] **Step 5: Create `src/components/ui/Toast.tsx`**

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; message: string };

type ToastStore = {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(kind: ToastKind, message: string) {
  useToastStore.getState().push(kind, message);
}

const tone: Record<ToastKind, string> = {
  success: 'border-accent text-accent',
  error: 'border-danger text-danger',
  info: 'border-border text-text',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className={`rounded-md border bg-surface px-4 py-2 text-sm shadow-subtle-md ${tone[t.kind]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): add Button, Input, Spinner, Toast primitives"
```

---

## Task 4 : Env loader

**Files:**
- Create: `src/lib/env.ts`, `.env.example`

- [ ] **Step 1: Create `.env.example`**

```
VITE_DISCORD_CLIENT_ID=replace_me
VITE_DISCORD_REDIRECT_URI=http://localhost:5173/footsim/auth/callback
VITE_DATA_REPO=BJBellum/footsim-data
VITE_DATA_BRANCH=main
VITE_ADMIN_DISCORD_ID=772821169664426025
```

- [ ] **Step 2: Create `src/lib/env.ts`**

```ts
function required(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv];
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const env = {
  discordClientId: required('VITE_DISCORD_CLIENT_ID'),
  discordRedirectUri: required('VITE_DISCORD_REDIRECT_URI'),
  dataRepo: required('VITE_DATA_REPO'),
  dataBranch: required('VITE_DATA_BRANCH'),
  adminDiscordId: required('VITE_ADMIN_DISCORD_ID'),
};
```

- [ ] **Step 3: Add `.env` to `.gitignore`**

Append to `.gitignore`:

```
.env
.env.local
.env.production.local
```

- [ ] **Step 4: Create local `.env` (developer step)**

Copy `.env.example` to `.env` and fill in the real Discord client ID. **Do not commit `.env`.**

- [ ] **Step 5: Commit**

```bash
git add .env.example src/lib/env.ts .gitignore
git commit -m "feat(env): add typed env loader and example file"
```

---

## Task 5 : Discord OAuth — URL builder + fragment parser

**Files:**
- Create: `src/lib/auth/discord.ts`, `src/lib/auth/discord.test.ts`

- [ ] **Step 1: Write failing test `src/lib/auth/discord.test.ts`**

```ts
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
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/footsim/auth/callback');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe('identify');
  });
});

describe('parseTokenFragment', () => {
  it('extracts access_token and expires_in', () => {
    const result = parseTokenFragment('#access_token=abc&token_type=Bearer&expires_in=604800');
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/lib/auth/discord.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth/discord.ts`**

```ts
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

export function parseTokenFragment(fragment: string): { accessToken: string; expiresIn: number } | null {
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
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/lib/auth/discord.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): Discord URL builder, fragment parser, admin check"
```

---

## Task 6 : Session store + persistence

**Files:**
- Create: `src/stores/session.ts`

- [ ] **Step 1: Implement `src/stores/session.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/lib/auth/discord';
import { isAdminId } from '@/lib/auth/discord';

type State = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  isLoggedIn: () => boolean;
  isAdmin: () => boolean;
  isExpired: () => boolean;
  logout: () => void;
};

export const useSession = create<State>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      isLoggedIn: () => {
        const s = get().session;
        return Boolean(s) && !get().isExpired();
      },
      isAdmin: () => {
        const s = get().session;
        return Boolean(s) && !get().isExpired() && isAdminId(s!.id);
      },
      isExpired: () => {
        const s = get().session;
        if (!s) return true;
        return Date.now() >= s.expiresAt;
      },
      logout: () => set({ session: null }),
    }),
    { name: 'footsim.session' },
  ),
);
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/session.ts
git commit -m "feat(auth): Zustand session store with localStorage persistence"
```

---

## Task 7 : Routing skeleton

**Files:**
- Create: `src/router.tsx`, `src/pages/Home.tsx`, `src/pages/auth/Callback.tsx`, `src/pages/NoAccess.tsx`, `src/pages/dashboard/Dashboard.tsx`, `src/pages/dashboard/Settings.tsx`, `src/components/auth/RequireAdmin.tsx`, `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/auth/RequireAdmin.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useSession } from '@/stores/session';
import type { ReactNode } from 'react';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useSession((s) => s.isAdmin());
  const isLoggedIn = useSession((s) => s.isLoggedIn());
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/no-access" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Create `src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

const items = [
  { to: '/dashboard', label: 'Vue d’ensemble', end: true },
  { to: '/dashboard/teams', label: 'Équipes' },
  { to: '/match', label: 'Matchs' },
  { to: '/dashboard/settings', label: 'Réglages' },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      <div className="mb-10 px-2 font-display text-2xl">FootSim</div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-accent/10 text-accent' : 'text-text/80 hover:bg-border/40',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create `src/components/layout/DashboardLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-10 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/pages/Home.tsx`**

```tsx
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { buildDiscordAuthUrl } from '@/lib/auth/discord';
import { useSession } from '@/stores/session';
import { Link } from 'react-router-dom';

export default function Home() {
  const isAdmin = useSession((s) => s.isAdmin());
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
        Simulez le football du Projet Résurgence. Créez vos équipes, générez vos rosters, faites s’affronter les nations.
      </motion.p>
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        {isAdmin ? (
          <>
            <Button asChild={false} onClick={() => (window.location.href = '/footsim/dashboard')}>
              Dashboard
            </Button>
            <Link to="/match">
              <Button variant="ghost">Lancer un match</Button>
            </Link>
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
```

- [ ] **Step 5: Create `src/pages/auth/Callback.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDiscordUser, parseTokenFragment, isAdminId } from '@/lib/auth/discord';
import { useSession } from '@/stores/session';
import { Spinner } from '@/components/ui/Spinner';

export default function Callback() {
  const navigate = useNavigate();
  const setSession = useSession((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseTokenFragment(window.location.hash);
    if (!parsed) {
      setError('Token Discord absent.');
      return;
    }
    fetchDiscordUser(parsed.accessToken)
      .then((user) => {
        setSession({
          id: user.id,
          username: user.global_name ?? user.username,
          avatar: user.avatar,
          accessToken: parsed.accessToken,
          expiresAt: Date.now() + parsed.expiresIn * 1000,
        });
        navigate(isAdminId(user.id) ? '/dashboard' : '/no-access', { replace: true });
      })
      .catch((err) => setError(String(err)));
  }, [navigate, setSession]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      {error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : (
        <>
          <Spinner className="h-6 w-6" />
          <p className="text-muted text-sm">Connexion à Discord…</p>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Create `src/pages/NoAccess.tsx`**

```tsx
import { Link } from 'react-router-dom';

export default function NoAccess() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl">Accès réservé</h1>
      <p className="max-w-md text-muted">
        FootSim est en accès restreint. Seul l’administrateur du Projet Résurgence peut gérer équipes et matchs.
      </p>
      <Link to="/" className="text-accent text-sm underline">Retour à l’accueil</Link>
    </main>
  );
}
```

- [ ] **Step 7: Create `src/pages/dashboard/Dashboard.tsx`**

```tsx
export default function Dashboard() {
  return (
    <div>
      <h1 className="font-display text-4xl mb-6">Vue d’ensemble</h1>
      <p className="text-muted">Bienvenue. Crée une équipe pour commencer.</p>
    </div>
  );
}
```

- [ ] **Step 8: Create `src/pages/dashboard/Settings.tsx` (placeholder)**

```tsx
export default function Settings() {
  return (
    <div>
      <h1 className="font-display text-4xl mb-6">Réglages</h1>
      <p className="text-muted">Token GitHub et déconnexion arriveront dans l’étape suivante.</p>
    </div>
  );
}
```

- [ ] **Step 9: Create `src/router.tsx`**

```tsx
import { createBrowserRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import Callback from '@/pages/auth/Callback';
import NoAccess from '@/pages/NoAccess';
import Dashboard from '@/pages/dashboard/Dashboard';
import Settings from '@/pages/dashboard/Settings';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RequireAdmin } from '@/components/auth/RequireAdmin';

export const router = createBrowserRouter(
  [
    { path: '/', element: <Home /> },
    { path: '/auth/callback', element: <Callback /> },
    { path: '/no-access', element: <NoAccess /> },
    {
      path: '/dashboard',
      element: (
        <RequireAdmin>
          <DashboardLayout />
        </RequireAdmin>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'settings', element: <Settings /> },
      ],
    },
  ],
  { basename: '/footsim' },
);
```

- [ ] **Step 10: Update `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastViewport } from '@/components/ui/Toast';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
```

- [ ] **Step 11: Smoke test**

```bash
pnpm dev
```

Expected: home renders. `/footsim/dashboard` redirects to `/` if not logged in. Stop server.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(routing): home, callback, no-access, dashboard skeleton with admin guard"
```

---

## Task 8 : GitHub API client (PAT validation + read/write)

**Files:**
- Create: `src/lib/github/api.ts`, `src/lib/github/api.test.ts`

- [ ] **Step 1: Write failing test `src/lib/github/api.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    discordClientId: 'x', discordRedirectUri: 'x',
    dataRepo: 'BJBellum/footsim-data', dataBranch: 'main',
    adminDiscordId: 'ADMIN',
  },
}));

import { validatePat, readJson, writeJson } from './api';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('validatePat', () => {
  it('returns true on 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await validatePat('tok')).toBe(true);
  });
  it('returns false on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    expect(await validatePat('bad')).toBe(false);
  });
});

describe('readJson', () => {
  it('parses base64 content from contents API', async () => {
    const payload = { hello: 'world' };
    const encoded = btoa(JSON.stringify(payload));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: encoded, encoding: 'base64', sha: 'abc' }), { status: 200 }),
    );
    const result = await readJson('data/teams/x/team.json', 'tok');
    expect(result).toEqual({ data: payload, sha: 'abc' });
  });
  it('returns null on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await readJson('missing.json', 'tok')).toBeNull();
  });
});

describe('writeJson', () => {
  it('sends PUT with base64-encoded JSON, message, branch, and sha when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: { sha: 'newsha' } }), { status: 200 }),
    );
    const out = await writeJson({
      path: 'data/x.json', token: 'tok',
      data: { a: 1 }, message: 'feat: x', sha: 'oldsha',
    });
    expect(out).toEqual({ sha: 'newsha' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/repos/BJBellum/footsim-data/contents/data/x.json');
    expect(init?.method).toBe('PUT');
    const body = JSON.parse(init?.body as string);
    expect(body.message).toBe('feat: x');
    expect(body.branch).toBe('main');
    expect(body.sha).toBe('oldsha');
    expect(JSON.parse(atob(body.content))).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/lib/github/api.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/github/api.ts`**

```ts
import { env } from '@/lib/env';

const API = 'https://api.github.com';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function validatePat(token: string): Promise<boolean> {
  const res = await fetch(`${API}/user`, { headers: authHeaders(token) });
  return res.ok;
}

export async function readJson<T>(path: string, token: string): Promise<{ data: T; sha: string } | null> {
  const res = await fetch(`${API}/repos/${env.dataRepo}/contents/${path}?ref=${env.dataBranch}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${path}: ${res.status}`);
  const json = (await res.json()) as { content: string; sha: string; encoding: string };
  if (json.encoding !== 'base64') throw new Error(`Unexpected encoding ${json.encoding}`);
  const text = atob(json.content.replace(/\n/g, ''));
  return { data: JSON.parse(text) as T, sha: json.sha };
}

export type WriteOptions = {
  path: string;
  token: string;
  data: unknown;
  message: string;
  sha?: string;
};

export async function writeJson(opts: WriteOptions): Promise<{ sha: string }> {
  const body = {
    message: opts.message,
    content: btoa(JSON.stringify(opts.data, null, 2)),
    branch: env.dataBranch,
    ...(opts.sha ? { sha: opts.sha } : {}),
  };
  const res = await fetch(`${API}/repos/${env.dataRepo}/contents/${opts.path}`, {
    method: 'PUT',
    headers: { ...authHeaders(opts.token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write ${opts.path}: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { content: { sha: string } };
  return { sha: json.content.sha };
}

export async function listDir(path: string, token: string): Promise<string[]> {
  const res = await fetch(`${API}/repos/${env.dataRepo}/contents/${path}?ref=${env.dataBranch}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list ${path}: ${res.status}`);
  const json = (await res.json()) as Array<{ name: string; type: string }>;
  return json.filter((e) => e.type === 'dir').map((e) => e.name);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm vitest run src/lib/github/api.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(github): API client for read, write, list, PAT validation"
```

---

## Task 9 : Settings page (PAT input + logout)

**Files:**
- Modify: `src/pages/dashboard/Settings.tsx`
- Create: `src/stores/credentials.ts`

- [ ] **Step 1: Create `src/stores/credentials.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  githubPat: string | null;
  setPat: (pat: string | null) => void;
};

export const useCredentials = create<State>()(
  persist(
    (set) => ({
      githubPat: null,
      setPat: (githubPat) => set({ githubPat }),
    }),
    { name: 'footsim.github_pat' },
  ),
);
```

- [ ] **Step 2: Replace `src/pages/dashboard/Settings.tsx`**

```tsx
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
        <h1 className="font-display text-4xl mb-6">Réglages</h1>
        <p className="text-muted">Configure les credentials nécessaires à la persistance des données.</p>
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
        <Button variant="ghost" onClick={disconnect}>Se déconnecter</Button>
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
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Expected: navigate to `/dashboard/settings` (after login), enter PAT, click Enregistrer. Toast shows success or error. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): PAT input with validation, Discord profile, logout"
```

---

## Task 10 : Favicon

**Files:**
- Create: `public/favicon.svg`

- [ ] **Step 1: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1F8B4C"/>
  <text x="50%" y="58%" text-anchor="middle" font-family="Fraunces, serif" font-style="italic" font-weight="700" font-size="18" fill="#FAFAF8">F</text>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add public/favicon.svg
git commit -m "chore: add favicon"
```

---

## Task 11 : GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Write production env
        run: |
          echo "VITE_DISCORD_CLIENT_ID=${{ secrets.DISCORD_CLIENT_ID }}" >> .env.production
          echo "VITE_DISCORD_REDIRECT_URI=https://bjbellum.github.io/footsim/auth/callback" >> .env.production
          echo "VITE_DATA_REPO=BJBellum/footsim-data" >> .env.production
          echo "VITE_DATA_BRANCH=main" >> .env.production
          echo "VITE_ADMIN_DISCORD_ID=772821169664426025" >> .env.production
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: add GitHub Pages deploy workflow"
```

**Manual setup notes (not a step the agent can run):**
- Create repo `BJBellum/footsim` on GitHub.
- Push the `main` branch.
- In repo Settings → Pages → Source: GitHub Actions.
- In repo Settings → Secrets and variables → Actions: add `DISCORD_CLIENT_ID`.
- Create a Discord application at https://discord.com/developers/applications, set redirect URI to `https://bjbellum.github.io/footsim/auth/callback`. Copy the client ID into the secret above.
- Create the empty `BJBellum/footsim-data` repo (used by Plans 2 and 3).

---

## Task 12 : End-to-end smoke test

**Files:** none (validation only)

- [ ] **Step 1: Run all unit tests**

```bash
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Build production bundle**

```bash
pnpm build
```

Expected: `dist/` produced without errors. TypeScript should report 0 errors.

- [ ] **Step 3: Preview**

```bash
pnpm preview
```

Open `http://localhost:4173/footsim/`. Verify:
- Home page renders with Fraunces title + "Connexion Discord" button (if not logged in).
- Clicking "Connexion Discord" redirects to Discord (URL contains the right client_id and scope=identify).
- Direct navigation to `/footsim/dashboard` redirects to `/`.

Stop preview.

- [ ] **Step 4: Final commit (if any leftover)**

```bash
git status
```

Expected: clean tree. If not, commit with an appropriate message.

---

## Self-Review Notes

- All spec sections 2 (Tech Stack), 3 (Architecture, partial — only the auth/settings portion), 4 (Authentication), 9.2 (Style System), 10 (Deployment) for the foundation slice are covered.
- Sections 5 (Data Model), 6 (Player Generation), 7 (GitHub Persistence — read/write primitives only landed here, higher-level "store" comes in Plan 2), 8 (Match Engine), 9.1 / 9.3 / 9.4 (full UI surface) are intentionally deferred to Plans 2 and 3.
- No placeholders. All file paths absolute or relative to repo root. All code snippets complete.
- Type names used in `discord.ts`, `github/api.ts`, `session.ts`, `credentials.ts` are consistent across tasks.
