// La ruta pública se resuelve antes de importar el panel y su sesión administrativa.
export function resolverEntrada(ruta, consulta) {
  if (new URLSearchParams(consulta).get('demo') === '1') return { modo: 'demo' };
  if (!/^\/reservas(?:\/|$)/.test(ruta)) return { modo: 'conectado' };
  const coincidencia = /^\/reservas\/([^/]+)\/?$/.exec(ruta);
  let slug = null;
  try {
    const valor = coincidencia && decodeURIComponent(coincidencia[1]);
    if (valor && valor.length <= 100 && !/[\x00-\x1f\x7f/\\]/.test(valor) && !['.', '..'].includes(valor)) slug = valor;
  } catch { /* Una URL mal codificada recibe el estado público de enlace inválido. */ }
  return { modo: 'publico', slug };
}

// Las importaciones diferidas mantienen la demo y el producto en entradas separadas.
export async function iniciarEntrada(ubicacion, cargadores = {
  publico: () => import('./connected/portal-publico/portal.entrada.js'),
  conectado: () => import('./connected/conectado.entrada.js'),
  demo: () => import('./demo/demo.entrada.js'),
}) {
  const entrada = resolverEntrada(ubicacion.pathname, ubicacion.search);
  const modulo = await cargadores[entrada.modo]();
  if (entrada.modo === 'publico') await modulo.iniciarPortalPublico(entrada.slug);
}
