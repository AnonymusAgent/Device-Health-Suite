export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const clean = path.split('?')[0].split('#')[0];
  if (['/', '/monitor', '/stress', '/hardware', '/reports', '/settings', '/privacy', '/paywall'].includes(clean)) return clean;
  if (/^\/reports\/[a-zA-Z0-9-]+$/.test(clean)) return clean;
  return '/';
}
