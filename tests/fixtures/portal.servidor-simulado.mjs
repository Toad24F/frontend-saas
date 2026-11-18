import { createServer } from 'vite';
import { createHash, randomBytes } from 'node:crypto';
import { validarContacto } from '../../src/connected/portal-publico/reserva.contacto.js';

// Solo memoria de esta fixture: sesiones compartidas entre pestañas e historial
// de apartados/intentos. El contacto ficticio solo se valida y se reduce a hash;
// no se registran cuerpos, teléfonos ni notas en logs.
const sesiones = new Map();
let siguienteApartado = 1;
let desplazamientoReloj = 0;
let modoPrueba = 'normal';
let siguienteResultado = 1;
const horaServidor = () => Date.now() + desplazamientoReloj;
const simularCuenta = process.argv.includes('--account');
// Opt-in para revisar el perfil conectado con el contrato privado simulado.
// Cambia solo esta instancia de Vite; nunca usa credenciales ni API reales.
const usuarioPrueba = { id: 7, sub: 7, nombre: 'Administración ficticia', email: 'admin@example.test',
  rol: 'admin_negocio', negocioId: 7, negocioNombre: 'Consultorio de prueba · API simulada', identificadorPublico: 'qa-portal' };

// Servidor de revisión aislado: intercepta TODA ruta /publico antes del proxy.
// Sus respuestas son ficticias, visibles como tales; nunca escribe en el backend.
const servidor = await createServer({
  ...(simularCuenta ? { define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:5193') } } : {}),
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
  plugins: [{ name: 'portal-publico-simulado', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (simularCuenta && /^\/(auth|licencias|servicios|sucursales|profesionales|recepcionistas|bloqueos|negocios)(\/|\?|$)/.test(req.url)) {
        const ruta = new URL(req.url, 'http://localhost').pathname;
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
        const responder = (data) => res.end(JSON.stringify(data));
        if (ruta === '/auth/login' && req.method === 'POST') return responder({ accessToken: 'token-exclusivo-fixture-sin-autoridad-real', usuario: usuarioPrueba });
        if (ruta === '/auth/profile') return responder({ user: usuarioPrueba });
        if (ruta === '/licencias/mi-vigencia') return responder({ estado: 'vigente', condicionAcceso: true,
          ahora: '2026-10-20T16:00:00Z', venceEn: '2027-10-20T16:00:00Z', bloqueoProgramadoEn: null,
          tiempoRestante: { dias: 365, horas: 0, minutos: 0 }, duracionTotalMs: 31536000000 });
        if (ruta === '/sucursales/cupo') return responder({ negocioId: 7, disponibles: 1, limiteSucursalesActivas: 1, sucursalesActivas: 0 });
        if (['/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(ruta) && req.method === 'GET') return responder([]);
        // Ninguna otra ruta privada se delega al proxy ni al backend cotidiano.
        res.statusCode = 404; return responder({ message: 'Ruta privada no simulada.' });
      }
      if (req.url.startsWith('/__qa/mode?')) {
        const modo = new URL(req.url, 'http://localhost').searchParams.get('value');
        if (['normal', 'lost_after', 'lost_before', 'resolve_error'].includes(modo)) modoPrueba = modo;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(`Modo de API ficticia: ${modoPrueba}`); return;
      }
      if (req.url.startsWith('/__qa/advance?')) {
        const ms = Number(new URL(req.url, 'http://localhost').searchParams.get('ms'));
        if (Number.isFinite(ms) && ms >= 0 && ms <= 300000) desplazamientoReloj += ms;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Reloj ficticio avanzado. No se modificó el backend.');
        return;
      }
      if (!req.url.startsWith('/publico/')) return next();
      const url = new URL(req.url, 'http://localhost');
      const base = '/publico/negocios/qa-portal/';
      const responder = (data, status = 200) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(data));
      };
      if (!url.pathname.startsWith(base)) return responder({ codigo: 'portal_404', mensaje: 'Portal de prueba inexistente.', accion: 'volver' }, 404);
      const negocio = { slug: 'qa-portal', nombre: 'Consultorio de prueba · API simulada' };
      const cookieRecibida = /(?:^|;\s*)reserva_sesion=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1];
      if (url.pathname === `${base}sesion`) {
        const cookie = cookieRecibida || randomBytes(32).toString('base64url');
        if (!sesiones.has(cookie)) sesiones.set(cookie, { generation: 0, holds: new Map(), operations: new Map(), attempts: new Map() });
        res.setHeader('Set-Cookie', `reserva_sesion=${cookie}; Path=${base}; HttpOnly; SameSite=Strict`);
        return responder({ negocio, csrfToken: createHash('sha256').update(cookie).digest('hex') });
      }
      if (url.pathname.startsWith(`${base}intentos`)) {
        const sesion = sesiones.get(cookieRecibida);
        if (!sesion) return responder({ codigo: 'portal_401', mensaje: 'Sesión de prueba no disponible.', accion: 'reiniciar' }, 401);
        if (req.method !== 'POST' || req.headers['x-csrf-token'] !== createHash('sha256').update(cookieRecibida).digest('hex')) {
          return responder({ codigo: 'portal_403', mensaje: 'Solicitud de prueba no autorizada.', accion: 'corregir' }, 403);
        }
        let texto = '';
        req.on('data', (chunk) => { texto += chunk; });
        req.on('end', () => {
          let body;
          try { body = JSON.parse(texto); } catch { return responder({}, 400); }
          const coincidencia = /^intentos\/([A-Za-z0-9_-]{16,64})\/(reservar|resolver)$/.exec(url.pathname.slice(base.length));
          if (url.pathname === `${base}intentos`) {
            if (modoPrueba === 'lost_before') { res.destroy(); return; }
            let intento = sesion.attempts.get(body.clave);
            const apartado = sesion.holds.get(body.apartadoId);
            if (!intento) {
              if (!apartado || apartado.released || apartado.generacion !== String(sesion.generation) || horaServidor() >= Date.parse(apartado.expiraEn)) {
                return responder({ codigo: 'portal_404', mensaje: 'Apartado no disponible.', accion: 'volver' }, 404);
              }
              intento = { id: body.clave, apartadoId: body.apartadoId, estado: 'preparado' }; sesion.attempts.set(body.clave, intento);
            }
            if (intento.estado === 'no_registrado' || intento.apartadoId !== body.apartadoId) return responder({ codigo: 'portal_409', mensaje: 'Intento cerrado o incompatible.', accion: 'volver' }, 409);
            return responder({ id: body.clave, apartadoId: body.apartadoId, estado: intento.estado });
          }
          if (!coincidencia) return responder({}, 404);
          const clave = coincidencia[1]; let intento = sesion.attempts.get(clave);
          if (coincidencia[2] === 'resolver') {
            if (modoPrueba === 'resolve_error') return responder({ codigo: 'portal_503', mensaje: 'Resultado aún no comprobable.', accion: 'reintentar' }, 503);
            if (intento && intento.apartadoId !== body.apartadoId) return responder({}, 409);
            if (intento?.estado === 'registrado') { modoPrueba = 'normal'; return responder({ estado: 'registrado', resultado: intento.resultado }); }
            const apartado = sesion.holds.get(body.apartadoId);
            if (!apartado) return responder({ codigo: 'portal_404', mensaje: 'Intento no disponible.', accion: 'volver' }, 404);
            if (!intento) { intento = { id: clave, apartadoId: body.apartadoId }; sesion.attempts.set(clave, intento); }
            intento.estado = 'no_registrado';
            if (apartado.generacion === String(sesion.generation)) apartado.released = true;
            modoPrueba = 'normal'; return responder({ estado: 'no_registrado' });
          }
          const validado = validarContacto(body);
          if (!validado.valido) return responder({ codigo: 'portal_400', mensaje: 'Revise los datos del formulario.', accion: 'corregir' }, 400);
          const hash = createHash('sha256').update(JSON.stringify(validado.valor)).digest('hex');
          if (intento?.estado === 'registrado') {
            if (intento.hash !== hash) return responder({}, 409);
            if (modoPrueba === 'lost_after') { res.destroy(); return; }
            return responder(intento.resultado);
          }
          const apartado = sesion.holds.get(intento?.apartadoId);
          if (!intento || intento.estado !== 'preparado' || !apartado || apartado.released || apartado.generacion !== String(sesion.generation) || horaServidor() >= Date.parse(apartado.expiraEn)) {
            return responder({ codigo: 'portal_409', mensaje: 'El apartado ya no está disponible.', accion: 'volver' }, 409);
          }
          const inicio = new Date(`${apartado.selection.fechaLocal}T${apartado.selection.horaInicio}:00-07:00`);
          // El doble expone el mismo nombre público que la API: costo del
          // apartado registrado, sin publicar el campo interno costoAceptado.
          intento.resultado = { folio: `P-${String(siguienteResultado++).padStart(18, '0')}`, estado: 'pendiente',
            inicioUtc: inicio.toISOString(), finUtc: new Date(inicio.getTime() + 30 * 60000).toISOString(), zonaHoraria: apartado.zonaHoraria,
            costo: apartado.costo, nombreNegocio: negocio.nombre, nombreServicio: apartado.selection.servicioId === 4 ? 'Seguimiento guardado' : 'Consulta general guardada',
            nombreSucursal: 'Sucursal Centro guardada', nombreProfesional: 'Profesional guardado' };
          intento.estado = 'registrado'; intento.hash = hash; apartado.released = true;
          // Se pierden también repeticiones de transporte del navegador; solo
          // el resolutor o un cambio explícito de modo restablecen la respuesta.
          if (modoPrueba === 'lost_after') { res.destroy(); return; }
          return responder(intento.resultado);
        });
        return;
      }
      if (url.pathname.startsWith(`${base}apartados`)) {
        const sesion = sesiones.get(cookieRecibida);
        if (!sesion) return responder({ codigo: 'portal_401', mensaje: 'Sesión de prueba no disponible.', accion: 'reiniciar' }, 401);
        const coincidencia = /^apartados\/(\d+)(\/liberar)?$/.exec(url.pathname.slice(base.length));
        if (req.method === 'GET' && coincidencia && !coincidencia[2]) {
          const apartado = sesion.holds.get(Number(coincidencia[1]));
          if (!apartado) return responder({ codigo: 'portal_404', mensaje: 'Apartado de prueba inexistente.', accion: 'volver' }, 404);
          return responder({ apartadoId: apartado.apartadoId, generacion: apartado.generacion, expiraEn: apartado.expiraEn,
            servidorAhora: new Date(horaServidor()).toISOString(), estado: String(sesion.generation) !== apartado.generacion
              ? 'sustituido' : apartado.released ? 'liberado' : horaServidor() >= Date.parse(apartado.expiraEn) ? 'vencido' : 'vigente' });
        }
        if (req.method !== 'POST' || req.headers['x-csrf-token'] !== createHash('sha256').update(cookieRecibida).digest('hex')) {
          return responder({ codigo: 'portal_403', mensaje: 'Solicitud de prueba no autorizada.', accion: 'corregir' }, 403);
        }
        let texto = '';
        req.on('data', (chunk) => { texto += chunk; });
        req.on('end', () => {
          let body;
          try { body = JSON.parse(texto); } catch { return responder({ codigo: 'portal_400', mensaje: 'Cuerpo de prueba inválido.', accion: 'corregir' }, 400); }
          if (coincidencia?.[2]) {
            const apartado = sesion.holds.get(Number(coincidencia[1]));
            if (!apartado || body.generacion !== apartado.generacion) return responder({ codigo: 'portal_404', mensaje: 'Apartado de prueba inexistente.', accion: 'volver' }, 404);
            apartado.released = true; res.statusCode = 204; res.end(); return;
          }
          if (url.pathname !== `${base}apartados`) return responder({}, 404);
          let apartado = sesion.operations.get(body.clave);
          if (!apartado) {
            sesion.generation++;
            // Seleccionar seguimiento a las 09:00 reproduce un reemplazo fallido.
            if (body.servicioId === 4 && body.horaInicio === '09:00') {
              return responder({ codigo: 'portal_409', mensaje: 'Horario de prueba en conflicto.', accion: 'volver' }, 409);
            }
            apartado = { estado: 'concedida', apartadoId: siguienteApartado++, generacion: String(sesion.generation),
              expiraEn: new Date(horaServidor() + 300000).toISOString(), costo: body.servicioId === 4 ? '350.00' : '450.00', zonaHoraria: 'America/Mazatlan', selection: body };
            sesion.operations.set(body.clave, apartado); sesion.holds.set(apartado.apartadoId, apartado);
          }
          responder({ ...apartado, servidorAhora: new Date(horaServidor()).toISOString() });
        });
        return;
      }
      if (url.pathname === `${base}catalogo`) return responder({ negocio,
        servicios: [{ id: 1, nombre: 'Consulta general', costo: '450.00', duracionMinutos: 30 },
          { id: 4, nombre: 'Consulta de seguimiento', costo: '350.00', duracionMinutos: 20 }],
        sucursales: url.searchParams.has('servicioId') ? [{ id: 2, nombre: 'Sucursal Centro', direccion: 'Dirección ficticia para revisión', zonaHoraria: 'America/Mazatlan' }] : [],
        profesionales: url.searchParams.has('sucursalId') ? [{ id: 3, nombre: 'Profesional de prueba' }] : [],
      });
      if (url.pathname === `${base}disponibilidad`) {
        const desde = url.searchParams.get('desde');
        const hasta = url.searchParams.get('hasta');
        // Días fijos reproducibles: 21 vacío, 22 error técnico, 23 selección inválida.
        if (desde === '2026-10-22' || desde === '2026-10-23') {
          const status = desde.endsWith('22') ? 503 : 404;
          return responder({ codigo: `portal_${status}`, mensaje: status === 503 ? 'Portal temporalmente no disponible.' : 'La selección no está disponible.', accion: status === 503 ? 'reintentar' : 'volver' }, status);
        }
        return responder({ servicioId: Number(url.searchParams.get('servicioId')), sucursalId: 2, personalId: 3,
          desde, hasta, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', calculadoEn: new Date().toISOString(),
          ranuras: desde === '2026-10-21' ? [] : ['16:00', '17:00', '18:00'].map((hora) => ({
            inicioUtc: `${desde}T${hora}:00.000Z`, finUtc: `${desde}T${hora.slice(0, 2)}:30:00.000Z`,
          })), omisiones: [] });
      }
      return responder({ codigo: 'portal_404', mensaje: 'Ruta de prueba inexistente.', accion: 'volver' }, 404);
    });
  } }],
});
await servidor.listen();
servidor.printUrls();
