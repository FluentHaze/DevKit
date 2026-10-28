export const siteBase = import.meta.env.BASE_URL;
export const cachePrefix = `devkit-${siteBase.replace(/[^a-zA-Z0-9-]/g, '_')}-`;

export function sitePath(path: string, base = siteBase): string {
  return `${base}${path.replace(/^\/+/, '')}`;
}

export function readRoute(pathname = location.pathname, base = siteBase): string {
  if (!pathname.startsWith(base)) return '/404';
  const path = `/${pathname.slice(base.length)}`.replace(/\/+$/, '');
  return path || '/';
}
