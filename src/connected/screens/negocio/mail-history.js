import { escape as esc } from '../../../shared/ui.js';

export const mailStates = {
  pendiente: 'Pendiente',
  tomado: 'En proceso',
  enviado: 'Enviado',
  fallido: 'Fallido',
  descartado: 'Descartado',
};
export const mailTypes = {
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
const date = (value) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : null;

export function mailPage(
  deliveries,
  { status = '', type = '', page = 1 } = {},
) {
  const filtered = deliveries
    .filter(
      (item) =>
        (!status || item.estado === status) && (!type || item.tipo === type),
    )
    .slice()
    .sort((a, b) =>
      BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(page) ? page : 1),
  );
  return {
    rows: filtered.slice((current - 1) * 10, current * 10),
    total: filtered.length,
    pages,
    page: current,
  };
}

function followUp(item) {
  const confirmed = date(item.confirmadoEn),
    next = date(item.proximoIntentoEn);
  let text =
    item.estado === 'enviado'
      ? confirmed
        ? `Enviado el ${confirmed}`
        : 'Fecha de envío no disponible'
      : item.estado === 'tomado'
        ? 'Procesando envío'
        : item.estado === 'descartado'
          ? 'Este envío ya no se procesará'
          : ['pendiente', 'fallido'].includes(item.estado)
            ? next
              ? `Procesamiento previsto a partir del ${next}`
              : 'Sin fecha de procesamiento disponible'
            : 'Sin seguimiento disponible';
  return `<span>${esc(text)}</span>${item.ultimoError ? `<small class="mail-error">${esc(item.ultimoError)}</small>` : ''}${item.estado === 'fallido' ? `<button type="button" class="text-button" data-retry-delivery="${esc(item.id)}" aria-label="Reintentar ahora: ${esc(mailTypes[item.tipo] || item.tipo)}, envío ${esc(item.id)}">Reintentar ahora</button>` : ''}`;
}

export function mailResultsHtml(deliveries, options = {}) {
  const result = mailPage(deliveries, options);
  if (!result.total)
    return `<div class="mail-empty"><h3>${deliveries.length ? 'No hay correos con estos filtros' : 'Sin correos registrados'}</h3><p>${deliveries.length ? 'Prueba otro estado o tipo de correo.' : 'Aquí aparecerán las invitaciones y los avisos del negocio.'}</p>${deliveries.length ? '<button type="button" class="btn btn-light" data-mail-clear>Limpiar filtros</button>' : ''}</div>`;
  return `<table class="table app-table align-middle mail-table"><caption class="visually-hidden">Historial de correos del negocio</caption><thead><tr><th scope="col">Correo</th><th scope="col">Estado</th><th scope="col">Intentos</th><th scope="col">Seguimiento</th></tr></thead><tbody>${result.rows.map((item) => `<tr><td data-label="Correo"><strong>${esc(mailTypes[item.tipo] || item.tipo)}</strong></td><td data-label="Estado"><span class="soft-tag mail-state mail-state-${Object.hasOwn(mailStates, item.estado) ? item.estado : 'unknown'}">${esc(mailStates[item.estado] || item.estado)}</span></td><td data-label="Intentos">${esc(item.intentos)}</td><td data-label="Seguimiento"><div class="mail-follow-up">${followUp(item)}</div></td></tr>`).join('')}</tbody></table>
    <div class="mail-footer"><p role="status">Mostrando ${(result.page - 1) * 10 + 1}–${Math.min(result.page * 10, result.total)} de ${result.total} correos</p>${result.total > 10 ? `<nav aria-label="Paginación de correos"><button type="button" class="btn btn-light" data-mail-page="${result.page - 1}" ${result.page === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${result.page} de ${result.pages}</span><button type="button" class="btn btn-light" data-mail-page="${result.page + 1}" ${result.page === result.pages ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}

export function mailHistoryHtml(deliveries, options = {}) {
  const select = (field, label, values) =>
    `<label>${label}<select class="form-select" data-mail-filter="${field}"><option value="">Todos</option>${Object.entries(
      values,
    )
      .map(
        ([value, text]) =>
          `<option value="${esc(value)}" ${options[field] === value ? 'selected' : ''}>${esc(text)}</option>`,
      )
      .join('')}</select></label>`;
  const types = Object.fromEntries(
    [...new Set(deliveries.map((item) => item.tipo))].map((type) => [
      type,
      mailTypes[type] || type,
    ]),
  );
  return `<div class="mail-filters">${select('status', 'Estado', mailStates)}${select('type', 'Tipo de correo', types)}<button type="button" class="btn btn-light" data-mail-clear>Limpiar filtros</button><button type="button" class="btn btn-light" data-mail-refresh>Actualizar</button></div><div data-mail-results>${mailResultsHtml(deliveries, options)}</div>`;
}
