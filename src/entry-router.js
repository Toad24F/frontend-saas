// La ruta pública se resuelve antes de importar el panel y su sesión administrativa.
export function resolveEntry(pathname, search) {
  if (new URLSearchParams(search).get('demo') === '1') return { mode: 'demo' };
  if (!/^\/reservas(?:\/|$)/.test(pathname)) return { mode: 'connected' };
  const match = /^\/reservas\/([^/]+)\/?$/.exec(pathname);
  let slug = null;
  try {
    const value = match && decodeURIComponent(match[1]);
    if (value && value.length <= 100 && !/[\x00-\x1f\x7f/\\]/.test(value) && !['.', '..'].includes(value)) slug = value;
  } catch { /* Una URL mal codificada recibe el estado público de enlace inválido. */ }
  return { mode: 'public', slug };
}

// Las importaciones diferidas mantienen la demo y el producto en entradas separadas.
export async function boot(location, loaders = {
  public: () => import('./connected/public/entry.js'),
  connected: () => import('./connected/entry.js'),
  demo: () => import('./demo/entry.js'),
}) {
  const entry = resolveEntry(location.pathname, location.search);
  const module = await loaders[entry.mode]();
  if (entry.mode === 'public') await module.startPublicPortal(entry.slug);
}
