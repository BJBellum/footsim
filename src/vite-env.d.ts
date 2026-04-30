/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_DISCORD_REDIRECT_URI: string;
  readonly VITE_DATA_REPO: string;
  readonly VITE_DATA_BRANCH: string;
  readonly VITE_ADMIN_DISCORD_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
