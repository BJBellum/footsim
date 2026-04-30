export type ThemeMode = 'day' | 'night';

export function modeForHour(hour: number): ThemeMode {
  return hour >= 6 && hour < 19 ? 'day' : 'night';
}

export function applyTheme(mode: ThemeMode): void {
  const html = document.documentElement;
  html.classList.toggle('dark', mode === 'night');
  html.dataset.theme = mode;
}

export function startThemeCycle(): () => void {
  const update = () => applyTheme(modeForHour(new Date().getHours()));
  update();
  const id = window.setInterval(update, 60_000);
  return () => window.clearInterval(id);
}
