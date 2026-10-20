import { createServer } from 'vite';
import { createHash, randomBytes } from 'node:crypto';

// Servidor de revisión aislado: intercepta TODA ruta /publico antes del proxy.
// Sus respuestas son ficticias, visibles como tales; nunca escribe en el backend.
const server = await createServer({
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
  plugins: [{ name: 'public-selection-fixture', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (!req.url.startsWith('/publico/')) return next();
      const url = new URL(req.url, 'http://localhost');
      const base = '/publico/negocios/qa-portal/';
      const send = (data, status = 200) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(data));
      };
      if (!url.pathname.startsWith(base)) return send({ codigo: 'portal_404', mensaje: 'Portal de prueba inexistente.', accion: 'volver' }, 404);
      const negocio = { slug: 'qa-portal', nombre: 'Consultorio de prueba · API simulada' };
      if (url.pathname === `${base}sesion`) {
        const cookie = /(?:^|;\s*)reserva_sesion=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1] || randomBytes(32).toString('base64url');
        res.setHeader('Set-Cookie', `reserva_sesion=${cookie}; Path=${base}; HttpOnly; SameSite=Strict`);
        return send({ negocio, csrfToken: createHash('sha256').update(cookie).digest('hex') });
      }
      if (url.pathname === `${base}catalogo`) return send({ negocio,
        servicios: [{ id: 1, nombre: 'Consulta general', costo: '450.00', duracionMinutos: 30 },
          { id: 4, nombre: 'Consulta de seguimiento', costo: '350.00', duracionMinutos: 20 }],
        sucursales: url.searchParams.has('servicioId') ? [{ id: 2, nombre: 'Sucursal Centro', direccion: 'Dirección ficticia para revisión', zonaHoraria: 'America/Mazatlan' }] : [],
        profesionales: url.searchParams.has('sucursalId') ? [{ id: 3, nombre: 'Profesional de prueba' }] : [],
      });
      if (url.pathname === `${base}disponibilidad`) {
        const desde = url.searchParams.get('desde');
        // Días fijos reproducibles: 21 vacío, 22 error técnico, 23 selección inválida.
        if (desde === '2026-10-22' || desde === '2026-10-23') {
          const status = desde.endsWith('22') ? 503 : 404;
          return send({ codigo: `portal_${status}`, mensaje: status === 503 ? 'Portal temporalmente no disponible.' : 'La selección no está disponible.', accion: status === 503 ? 'reintentar' : 'volver' }, status);
        }
        return send({ servicioId: Number(url.searchParams.get('servicioId')), sucursalId: 2, personalId: 3,
          desde, hasta: desde, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', calculadoEn: new Date().toISOString(),
          ranuras: desde === '2026-10-21' ? [] : ['16:00', '17:00', '18:00'].map((hour) => ({
            inicioUtc: `${desde}T${hour}:00.000Z`, finUtc: `${desde}T${hour.slice(0, 2)}:30:00.000Z`,
          })), omisiones: [] });
      }
      return send({ codigo: 'portal_404', mensaje: 'Esta fixture no admite apartados ni reservas.', accion: 'volver' }, 404);
    });
  } }],
});
await server.listen();
server.printUrls();
