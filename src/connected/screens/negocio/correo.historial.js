import { escaparHtml as escapar } from '../../../shared/interfaz.componentes.js';

export const estadosCorreo = {
  pendiente: 'Pendiente',
  tomado: 'En proceso',
  enviado: 'Enviado',
  fallido: 'Fallido',
  descartado: 'Descartado',
};
export const tiposCorreo = {
  activacion_admin: 'Invitación de administrador',
  recuperacion: 'Recuperación de acceso',
  aviso_vencimiento: 'Aviso de vencimiento',
  aviso_preventivo: 'Aviso preventivo',
  licencia_vencida: 'Licencia vencida',
  suspension_programada: 'Suspensión programada',
  suspension_efectiva: 'Suspensión efectiva',
  suspension_inmediata: 'Suspensión inmediata',
  suspension_revocada: 'Suspensión revocada',
  licencia_reactivada: 'Licencia reactivada',
  licencia_renovada: 'Licencia renovada',
};
const fecha = (valor) =>
  valor && Number.isFinite(Date.parse(valor))
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(valor))
    : null;

export function paginarCorreo(
  envios,
  { estado = '', tipo = '', pagina = 1 } = {},
) {
  const filtrados = envios
    .filter(
      (elemento) =>
        (!estado || elemento.estado === estado) && (!tipo || elemento.tipo === tipo),
    )
    .slice()
    .sort((a, b) =>
      BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0,
    );
  const paginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const actual = Math.min(
    paginas,
    Math.max(1, Number.isSafeInteger(pagina) ? pagina : 1),
  );
  return {
    filas: filtrados.slice((actual - 1) * 10, actual * 10),
    total: filtrados.length,
    paginas,
    pagina: actual,
  };
}

function renderSeguimiento(elemento) {
  const confirmado = fecha(elemento.confirmadoEn),
    siguiente = fecha(elemento.proximoIntentoEn);
  let texto =
    elemento.estado === 'enviado'
      ? confirmado
        ? `Enviado el ${confirmado}`
        : 'Fecha de envío no disponible'
      : elemento.estado === 'tomado'
        ? 'Procesando envío'
        : elemento.estado === 'descartado'
          ? 'Este envío ya no se procesará'
          : ['pendiente', 'fallido'].includes(elemento.estado)
            ? siguiente
              ? `Procesamiento previsto a partir del ${siguiente}`
              : 'Sin fecha de procesamiento disponible'
            : 'Sin seguimiento disponible';
  return `<span>${escapar(texto)}</span>${elemento.ultimoError ? `<small class="correo-error">${escapar(elemento.ultimoError)}</small>` : ''}${elemento.estado === 'fallido' ? `<button type="button" class="boton-texto" data-reintentar-envio="${escapar(elemento.id)}" aria-label="Reintentar ahora: ${escapar(tiposCorreo[elemento.tipo] || elemento.tipo)}, envío ${escapar(elemento.id)}">Reintentar ahora</button>` : ''}`;
}

export function renderResultadosCorreo(envios, opciones = {}) {
  const resultado = paginarCorreo(envios, opciones);
  if (!resultado.total)
    return `<div class="correo-vacio"><h3>${envios.length ? 'No hay correos con estos filtros' : 'Sin correos registrados'}</h3><p>${envios.length ? 'Prueba otro estado o tipo de correo.' : 'Aquí aparecerán las invitaciones y los avisos del negocio.'}</p>${envios.length ? '<button type="button" class="btn btn-light" data-correo-limpiar>Limpiar filtros</button>' : ''}</div>`;
  return `<table class="table tabla-app align-middle correo-tabla"><caption class="visually-hidden">Historial de correos del negocio</caption><thead><tr><th scope="col">Correo</th><th scope="col">Estado</th><th scope="col">Intentos</th><th scope="col">Seguimiento</th></tr></thead><tbody>${resultado.filas.map((elemento) => `<tr><td data-label="Correo"><strong>${escapar(tiposCorreo[elemento.tipo] || elemento.tipo)}</strong></td><td data-label="Estado"><span class="etiqueta-suave correo-estado correo-estado-${Object.hasOwn(estadosCorreo, elemento.estado) ? elemento.estado : 'desconocido'}">${escapar(estadosCorreo[elemento.estado] || elemento.estado)}</span></td><td data-label="Intentos">${escapar(elemento.intentos)}</td><td data-label="Seguimiento"><div class="correo-seguimiento">${renderSeguimiento(elemento)}</div></td></tr>`).join('')}</tbody></table>
    <div class="correo-pie"><p role="status">Mostrando ${(resultado.pagina - 1) * 10 + 1}–${Math.min(resultado.pagina * 10, resultado.total)} de ${resultado.total} correos</p>${resultado.total > 10 ? `<nav aria-label="Paginación de correos"><button type="button" class="btn btn-light" data-correo-pagina="${resultado.pagina - 1}" ${resultado.pagina === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${resultado.pagina} de ${resultado.paginas}</span><button type="button" class="btn btn-light" data-correo-pagina="${resultado.pagina + 1}" ${resultado.pagina === resultado.paginas ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}

export function renderHistorialCorreo(envios, opciones = {}) {
  const selector = (campo, etiqueta, valores) =>
    `<label>${etiqueta}<select class="form-select" data-correo-filtro="${campo}"><option value="">Todos</option>${Object.entries(
      valores,
    )
      .map(
        ([valor, texto]) =>
          `<option value="${escapar(valor)}" ${opciones[campo] === valor ? 'selected' : ''}>${escapar(texto)}</option>`,
      )
      .join('')}</select></label>`;
  const tipos = Object.fromEntries(
    [...new Set(envios.map((elemento) => elemento.tipo))].map((tipo) => [
      tipo,
      tiposCorreo[tipo] || tipo,
    ]),
  );
  return `<div class="correo-filtros">${selector('estado', 'Estado', estadosCorreo)}${selector('tipo', 'Tipo de correo', tipos)}<button type="button" class="btn btn-light" data-correo-limpiar>Limpiar filtros</button><button type="button" class="btn btn-light" data-correo-actualizar>Actualizar</button></div><div data-correo-resultados>${renderResultadosCorreo(envios, opciones)}</div>`;
}
