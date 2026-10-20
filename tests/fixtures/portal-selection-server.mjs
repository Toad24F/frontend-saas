import { createServer } from 'vite';
import { createHash, randomBytes } from 'node:crypto';

// Solo memoria de esta fixture: sesiones compartidas entre pestañas e historial
// de apartados. No se aceptan contacto ni intentos y no se registra ningún cuerpo.
const sessions = new Map();
let nextHold = 1;
let clockOffset = 0;
const serverTime = () => Date.now() + clockOffset;

// Servidor de revisión aislado: intercepta TODA ruta /publico antes del proxy.
// Sus respuestas son ficticias, visibles como tales; nunca escribe en el backend.
const server = await createServer({
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
  plugins: [{ name: 'public-selection-fixture', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/__qa/advance?')) {
        const ms = Number(new URL(req.url, 'http://localhost').searchParams.get('ms'));
        if (Number.isFinite(ms) && ms >= 0 && ms <= 300000) clockOffset += ms;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Reloj ficticio avanzado. No se modificó el backend.');
        return;
      }
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
      const received = /(?:^|;\s*)reserva_sesion=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1];
      if (url.pathname === `${base}sesion`) {
        const cookie = received || randomBytes(32).toString('base64url');
        if (!sessions.has(cookie)) sessions.set(cookie, { generation: 0, holds: new Map(), operations: new Map() });
        res.setHeader('Set-Cookie', `reserva_sesion=${cookie}; Path=${base}; HttpOnly; SameSite=Strict`);
        return send({ negocio, csrfToken: createHash('sha256').update(cookie).digest('hex') });
      }
      if (url.pathname.startsWith(`${base}apartados`)) {
        const session = sessions.get(received);
        if (!session) return send({ codigo: 'portal_401', mensaje: 'Sesión de prueba no disponible.', accion: 'reiniciar' }, 401);
        const match = /^apartados\/(\d+)(\/liberar)?$/.exec(url.pathname.slice(base.length));
        if (req.method === 'GET' && match && !match[2]) {
          const hold = session.holds.get(Number(match[1]));
          if (!hold) return send({ codigo: 'portal_404', mensaje: 'Apartado de prueba inexistente.', accion: 'volver' }, 404);
          return send({ apartadoId: hold.apartadoId, generacion: hold.generacion, expiraEn: hold.expiraEn,
            servidorAhora: new Date(serverTime()).toISOString(), estado: String(session.generation) !== hold.generacion
              ? 'sustituido' : hold.released ? 'liberado' : serverTime() >= Date.parse(hold.expiraEn) ? 'vencido' : 'vigente' });
        }
        if (req.method !== 'POST' || req.headers['x-csrf-token'] !== createHash('sha256').update(received).digest('hex')) {
          return send({ codigo: 'portal_403', mensaje: 'Solicitud de prueba no autorizada.', accion: 'corregir' }, 403);
        }
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          let body;
          try { body = JSON.parse(raw); } catch { return send({ codigo: 'portal_400', mensaje: 'Cuerpo de prueba inválido.', accion: 'corregir' }, 400); }
          if (match?.[2]) {
            const hold = session.holds.get(Number(match[1]));
            if (!hold || body.generacion !== hold.generacion) return send({ codigo: 'portal_404', mensaje: 'Apartado de prueba inexistente.', accion: 'volver' }, 404);
            hold.released = true; res.statusCode = 204; res.end(); return;
          }
          if (url.pathname !== `${base}apartados`) return send({}, 404);
          let hold = session.operations.get(body.clave);
          if (!hold) {
            session.generation++;
            // Seleccionar seguimiento a las 09:00 reproduce un reemplazo fallido.
            if (body.servicioId === 4 && body.horaInicio === '09:00') {
              return send({ codigo: 'portal_409', mensaje: 'Horario de prueba en conflicto.', accion: 'volver' }, 409);
            }
            hold = { estado: 'concedida', apartadoId: nextHold++, generacion: String(session.generation),
              expiraEn: new Date(serverTime() + 300000).toISOString(), costoAceptado: body.servicioId === 4 ? '350.00' : '450.00', zonaHoraria: 'America/Mazatlan' };
            session.operations.set(body.clave, hold); session.holds.set(hold.apartadoId, hold);
          }
          send({ ...hold, servidorAhora: new Date(serverTime()).toISOString() });
        });
        return;
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
      return send({ codigo: 'portal_404', mensaje: 'Esta fixture no admite envíos de reservas.', accion: 'volver' }, 404);
    });
  } }],
});
await server.listen();
server.printUrls();
