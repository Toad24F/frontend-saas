import { ErrorPortalPublico } from './portal.http.js';
import { fechaLocal, horaLocal, fechaValida } from './portal.fechas.js';
import { crearFiltrosIniciales, paginarOpciones } from '../../shared/portal-publico/portal.opciones.js';

// Las fases futuras tienen espacio propio; T101–T103 solo activan selección.
// Apartado, formulario, envío y resultado no se simulan ni se persisten aquí.
export const FASES_PORTAL = Object.freeze(['seleccion', 'apartado', 'formulario', 'enviando', 'incierto', 'resultado']);
const campos = ['servicioId', 'sucursalId', 'personalId'];
const listas = ['servicios', 'sucursales', 'profesionales'];
const id = (valor) => Number.isSafeInteger(valor) && valor > 0;
const respuestaInvalida = () => new ErrorPortalPublico('protocol', 'El portal devolvió una respuesta no válida. Reintente la consulta.');
const sumarDias = (fecha, dias) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);

export function crearSeleccionPortal(client, { slug, alCambiar = () => {}, ahora = () => new Date() } = {}) {
  const estado = { fase: 'seleccion', paso: 0,
    negocio: null,
    seleccion: { servicioId: null, sucursalId: null, personalId: null, fecha: '', horario: null },
    opciones: { servicios: [], sucursales: [], profesionales: [] }, horarios: [], fechasDisponibles: [], rangoFechas: null, zonaHoraria: '',
    consulta: { estado: 'inactiva', mensaje: '' }, filtros: Array.from({ length: 3 }, crearFiltrosIniciales), periodo: 'todos', pasosAutomaticos: [], apartado: null, formulario: null, envio: null, resultado: null };
  let revision = 0;
  let pendiente;
  const copiarEstado = () => structuredClone(estado);
  const emitir = () => alCambiar(copiarEstado());

  // Toda selección o navegación invalida la consulta previa aunque fetch ignore
  // abort(). La revisión también descarta errores atrasados, no solo éxitos.
  function invalidar() { revision++; pendiente?.abort(); pendiente = null; }
  function limpiarPosteriores(indice) {
    estado.pasosAutomaticos = estado.pasosAutomaticos.filter((paso) => paso <= indice);
    estado.periodo = 'todos';
    for (let i = indice + 1; i < campos.length; i++) {
      estado.seleccion[campos[i]] = null;
      estado.opciones[listas[i]] = [];
      estado.filtros[i] = crearFiltrosIniciales();
    }
    estado.seleccion.fecha = '';
    estado.seleccion.horario = null;
    estado.horarios = [];
    estado.fechasDisponibles = [];
    estado.rangoFechas = null;
    estado.zonaHoraria = '';
  }
  function validarSeleccion() {
    for (let i = 0; i < campos.length; i++) {
      const valor = estado.seleccion[campos[i]];
      if (valor !== null && !estado.opciones[listas[i]].some((opcion) => opcion.id === valor)) {
        estado.seleccion[campos[i]] = null;
        limpiarPosteriores(i);
        return;
      }
    }
  }
  function leerCatalogo(datos) {
    if (datos?.negocio?.slug !== slug || !listas.every((clave) => Array.isArray(datos[clave]) &&
      datos[clave].every((elemento) => id(elemento.id) && typeof elemento.nombre === 'string'))) throw respuestaInvalida();
    // La publicación de precios elimina la clave, no envía cero ni null.
    if (!datos.servicios.every((elemento) => (elemento.costo === undefined ||
      (typeof elemento.costo === 'string' && /^\d+(?:\.\d{1,2})?$/.test(elemento.costo))) &&
      id(elemento.duracionMinutos))) throw respuestaInvalida();
    for (const sucursal of datos.sucursales) {
      if (typeof sucursal.direccion !== 'string') throw respuestaInvalida();
      try { fechaLocal(ahora(), sucursal.zonaHoraria); } catch { throw respuestaInvalida(); }
      if (!sucursal.zonaHoraria) throw respuestaInvalida();
    }
    // Solo se conservan catálogos de etapas alcanzadas; nunca listas posteriores
    // procedentes de una selección anterior o de una respuesta inesperada.
    estado.negocio = datos.negocio;
    estado.opciones.servicios = datos.servicios;
    estado.opciones.sucursales = estado.paso >= 1 ? datos.sucursales : [];
    estado.opciones.profesionales = estado.paso >= 2 ? datos.profesionales : [];
    validarSeleccion();
    estado.pasosAutomaticos = estado.pasosAutomaticos.filter((paso) => estado.opciones[listas[paso]].length === 1 && estado.seleccion[campos[paso]] === estado.opciones[listas[paso]][0].id);
  }
  function leerDisponibilidad(datos, consulta) {
    if (!datos || campos.some((clave) => datos[clave] !== consulta[clave]) || datos.desde !== consulta.desde || datos.hasta !== consulta.hasta ||
      datos.modalidad !== 'publica' || !Array.isArray(datos.ranuras) || !datos.zonaHoraria) throw respuestaInvalida();
    const horarios = datos.ranuras.map((horario) => {
      if (!Number.isFinite(Date.parse(horario.inicioUtc)) || !Number.isFinite(Date.parse(horario.finUtc)) ||
        Date.parse(horario.inicioUtc) >= Date.parse(horario.finUtc)) throw respuestaInvalida();
      try {
        const fechaHorario = fechaLocal(horario.inicioUtc, datos.zonaHoraria);
        if (fechaHorario < consulta.desde || fechaHorario > consulta.hasta) throw respuestaInvalida();
        return { inicioUtc: horario.inicioUtc, finUtc: horario.finUtc, fechaLocal: fechaHorario,
          horaInicio: horaLocal(horario.inicioUtc, datos.zonaHoraria), horaFin: horaLocal(horario.finUtc, datos.zonaHoraria) };
      } catch { throw respuestaInvalida(); }
    });
    // Incluso sin ranuras se exige una zona IANA interpretable.
    try { fechaLocal(ahora(), datos.zonaHoraria); } catch { throw respuestaInvalida(); }
    estado.fechasDisponibles = [...new Set(horarios.map((horario) => horario.fechaLocal))].sort();
    estado.horarios = horarios.filter((horario) => horario.fechaLocal === estado.seleccion.fecha);
    estado.zonaHoraria = datos.zonaHoraria;
  }
  function prepararFecha() {
    if (estado.paso === 3 && !estado.seleccion.fecha) {
      const sucursal = estado.opciones.sucursales.find((elemento) => elemento.id === estado.seleccion.sucursalId);
      if (sucursal) { estado.zonaHoraria = sucursal.zonaHoraria; estado.seleccion.fecha = fechaLocal(ahora(), sucursal.zonaHoraria); }
    }
  }
  async function cargar(avanzarAutomaticamente = true) {
    invalidar();
    const actual = revision;
    pendiente = new AbortController();
    estado.seleccion.horario = null;
    estado.horarios = [];
    if (estado.paso === 3 && (!campos.every((clave) => id(estado.seleccion[clave])) || !fechaValida(estado.seleccion.fecha))) {
      estado.consulta = { estado: 'invalida', mensaje: 'Seleccione una fecha válida y complete servicio, sucursal y profesional.' }; emitir(); return;
    }
    estado.consulta = { estado: 'cargando', mensaje: estado.paso === 3 ? 'Buscando horarios disponibles…' : 'Consultando opciones disponibles…' }; emitir();
    const disponibilidad = estado.paso === 3;
    const sucursal = estado.opciones.sucursales.find((elemento) => elemento.id === estado.seleccion.sucursalId);
    const hoy = disponibilidad ? fechaLocal(ahora(), sucursal.zonaHoraria) : '';
    const inicioRango = disponibilidad ? [sumarDias(estado.seleccion.fecha, -10), hoy].sort().at(-1) : '';
    estado.rangoFechas = disponibilidad ? { desde: inicioRango, hasta: sumarDias(inicioRango, 30), hoy: hoy } : null;
    const consulta = disponibilidad ? { servicioId: estado.seleccion.servicioId, sucursalId: estado.seleccion.sucursalId,
      personalId: estado.seleccion.personalId, desde: inicioRango, hasta: estado.rangoFechas.hasta } : {
      ...(estado.paso >= 1 ? { servicioId: estado.seleccion.servicioId } : {}),
      ...(estado.paso >= 2 ? { sucursalId: estado.seleccion.sucursalId } : {}),
    };
    try {
      const datos = await client.solicitar(disponibilidad ? 'disponibilidad' : 'catalogo', { consulta, signal: pendiente.signal });
      if (actual !== revision) return;
      if (disponibilidad) leerDisponibilidad(datos, consulta); else leerCatalogo(datos);
      if (!disponibilidad) {
        const faltante = campos.findIndex((campo, indice) => indice < estado.paso && !estado.seleccion[campo]);
        if (faltante !== -1) { estado.paso = faltante; return cargar(false); }
        estado.filtros[estado.paso].pagina = paginarOpciones(estado.opciones[listas[estado.paso]], estado.paso, estado.filtros[estado.paso]).pagina;
        if (avanzarAutomaticamente && estado.paso > 0 && estado.opciones[listas[estado.paso]].length === 1) {
          estado.seleccion[campos[estado.paso]] = estado.opciones[listas[estado.paso]][0].id;
          limpiarPosteriores(estado.paso);
          if (!estado.pasosAutomaticos.includes(estado.paso)) estado.pasosAutomaticos.push(estado.paso);
          estado.paso++; prepararFecha(); return cargar();
        }
      }
      const cantidad = disponibilidad ? estado.horarios.length : estado.opciones[listas[estado.paso]].length;
      estado.consulta = { estado: cantidad ? 'lista' : 'vacia', mensaje: cantidad ? '' : disponibilidad
        ? 'No hay horarios disponibles para esta fecha. Elige otro día para consultar horarios.'
        : 'No hay opciones disponibles para esta selección. Puede volver y elegir otra opción.' };
    } catch (error) {
      if (actual !== revision) return;
      estado.horarios = [];
      estado.fechasDisponibles = [];
      estado.consulta = { estado: [400, 404, 409].includes(error.status) ? 'invalida' : 'error',
        mensaje: error instanceof ErrorPortalPublico ? error.message : disponibilidad ? 'No pudimos consultar los horarios. Reintenta para comprobar la disponibilidad.' : 'No se pudo consultar el portal. Reintente la consulta.' };
    }
    if (actual === revision) emitir();
  }
  return {
    obtenerEstado: copiarEstado, iniciar: () => cargar(), reintentar: () => cargar(),
    actualizarFiltros(campo, valor) {
      if (estado.paso >= 3 || estado.consulta.estado !== 'lista') return;
      if (campo === 'limpiar') estado.filtros[estado.paso] = crearFiltrosIniciales();
      else if (['busqueda', 'filtro', 'pagina'].includes(campo)) {
        estado.filtros[estado.paso][campo] = campo === 'pagina' ? Number(valor) : String(valor);
        if (campo !== 'pagina') estado.filtros[estado.paso].pagina = 1;
      } else return;
      const filtros = estado.filtros[estado.paso];
      filtros.pagina = paginarOpciones(estado.opciones[listas[estado.paso]], estado.paso, filtros).pagina;
      emitir();
    },
    seleccionarPeriodo(valor) { if (['todos', 'manana', 'tarde'].includes(valor)) { estado.periodo = valor; emitir(); } },
    // Solo se reinicia después de que el resolutor confirme ausencia terminal.
    async reiniciar() {
      invalidar(); estado.paso = 0;
      estado.filtros = Array.from({ length: 3 }, crearFiltrosIniciales);
      estado.seleccion.servicioId = null; estado.opciones.servicios = []; limpiarPosteriores(0);
      await cargar();
    },
    elegir(campo, valor) {
      const indice = campos.indexOf(campo);
      if (estado.fase !== 'seleccion' || indice !== estado.paso || !['lista', 'vacia'].includes(estado.consulta.estado) ||
        !estado.opciones[listas[indice]]?.some((opcion) => opcion.id === valor)) throw new Error('Selección no disponible.');
      if (estado.seleccion[campo] !== valor) { invalidar(); estado.seleccion[campo] = valor; limpiarPosteriores(indice); }
      emitir();
    },
    async continuar() {
      if (estado.fase !== 'seleccion' || estado.paso >= 3 || estado.consulta.estado !== 'lista' || !estado.seleccion[campos[estado.paso]]) return;
      estado.paso++;
      prepararFecha();
      await cargar();
    },
    async volver() {
      if (estado.fase !== 'seleccion' || estado.paso === 0) return;
      do { estado.paso--; } while (estado.paso > 0 && estado.pasosAutomaticos.includes(estado.paso));
      await cargar(false);
    },
    async seleccionarFecha(fecha) {
      if (estado.fase !== 'seleccion' || estado.paso !== 3) return;
      if (!estado.fechasDisponibles.includes(fecha)) estado.fechasDisponibles = [];
      estado.seleccion.fecha = fecha; estado.periodo = 'todos'; await cargar();
    },
    async desplazarRangoFechas(direccion) {
      if (estado.fase !== 'seleccion' || estado.paso !== 3 || !estado.rangoFechas || ![-1, 1].includes(direccion)) return;
      const { desde, hasta, hoy } = estado.rangoFechas;
      if (direccion < 0 && desde <= hoy) return;
      // load() consulta 10 días antes de la fecha elegida; el ancla mantiene
      // intervalos contiguos de 31 días sin inventar disponibilidad.
      const ancla = direccion > 0 ? sumarDias(hasta, 11) : sumarDias(desde, -21);
      estado.seleccion.fecha = ancla;
      estado.fechasDisponibles = [];
      estado.periodo = 'todos';
      await cargar();
    },
    elegirHorario(iniciar) {
      const horario = estado.horarios.find((elemento) => elemento.inicioUtc === iniciar);
      if (estado.fase !== 'seleccion' || estado.paso !== 3 || estado.consulta.estado !== 'lista' || !horario) throw new Error('Horario no disponible.');
      estado.seleccion.horario = horario; emitir();
    },
  };
}
