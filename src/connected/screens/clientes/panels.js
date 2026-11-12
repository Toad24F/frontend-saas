import { api, user } from '../../backend.js';
import { escape as esc } from '../../../shared/ui.js';
import { field } from '../../../shared/forms.js';
import {
  agendaPanel,
  agendaDraft,
  saveAgendaDraft,
  clearAgendaDraft,
} from '../../../shared/screens/agenda/panels.js';
import {
  createCustomerClient,
  customerPayload,
} from '../../modules/clientes/client.js';
import { createVersionedMutation } from '../../modules/agenda/versioned-mutation.js';
import { canManageAppointments } from '../../modules/agenda/manual-contract.js';
import { watchRecord } from '../agenda/live.js';
import { privateError } from '../../modules/agenda/errors.js';
import '../../../shared/screens/agenda/polish.css';
import '../agenda/style.css';

const client = createCustomerClient(api);
let generation = 0,
  returnTarget;
const scope = () =>
  user ? `${user.negocioId}:${user.id}:${user.sesionId || ''}` : '';
const historical = (value) =>
  value == null ? 'Sin registro histórico' : String(value);
window.addEventListener('cita-session-expired', () => {
  generation++;
  returnTarget = null;
});

// Reemplazar detalle por editor usa el mismo panel nativo; el foco final vuelve a la ficha del directorio.
function panel(title, body) {
  const old = document.querySelector('#app-dialog');
  if (!old?.open) returnTarget = document.activeElement;
  const dialog = agendaPanel(title, body, true);
  dialog.classList.add('m4-appointment-dialog');
  const id = returnTarget?.dataset.directoryOpen;
  dialog.onclose = () => {
    generation++;
    const target = id
      ? [...document.querySelectorAll('[data-directory-open]')].find(
          (el) => el.dataset.directoryOpen === id && el.offsetParent,
        )
      : document.querySelector('[data-directory-new]');
    (returnTarget?.isConnected ? returnTarget : target || document.querySelector('[data-directory-new]'))?.focus();
  };
  const heading = dialog.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus();
  return dialog;
}
const errorMarkup = (error) => { const info = privateError(error); return `<div role="alert"><strong>${info.title}</strong><p>${esc(info.message)}</p></div>${info.retry ? '<button class="btn btn-light" data-customer-retry>Reintentar consulta</button>' : ''}`; };
function pages(number, hasMore) {
  return `<div class="m4-history-pages"><button class="btn btn-light" data-customer-previous ${number === 1 ? 'disabled' : ''}>Página anterior</button><span>Página ${number}</span><button class="btn btn-light" data-customer-next ${!hasMore ? 'disabled' : ''}>Siguiente página</button></div>`;
}
export async function openCustomer(id, onChanged) {
  if (!canManageAppointments(user?.rol)) return;
  const revision = ++generation,
    identity = scope();
  const dialog = panel(
    'Ficha del cliente',
    '<div class="dialog-body"><p role="status">Consultando ficha…</p></div>',
  );
  const active = () =>
    dialog.open && revision === generation && identity === scope();
  try {
    const ficha = await client.detail(id);
    if (!active()) return;
    dialog.querySelector('.dialog-body').innerHTML =
      `<dl class="m4-detail-fields"><div><dt>Nombre completo</dt><dd>${esc(ficha.nombreCompleto)}</dd></div><div><dt>Teléfono</dt><dd>${esc(ficha.telefono)}</dd></div><div><dt>Cliente</dt><dd>#${ficha.id}</dd></div><div><dt>Versión</dt><dd>${ficha.version}</dd></div></dl><button class="btn btn-primary" data-customer-edit>Corregir ficha</button><section class="customer-history" aria-label="Historial del cliente"><h3>Historial de citas</h3><p class="field-hint">Los contactos y costos de cada cita conservan su registro histórico, aunque se corrija esta ficha.</p><div data-customer-history></div></section>`;
    dialog.querySelector('[data-customer-edit]').onclick = () =>
      openCustomerEditor(ficha, onChanged);
    let historyGeneration = 0;
    async function history(number = 1) {
      const current = ++historyGeneration,
        target = dialog.querySelector('[data-customer-history]');
      target.innerHTML = '<p role="status">Consultando historial…</p>';
      try {
        const result = await client.history(id, number);
        if (!active() || current !== historyGeneration) return;
        // Cada línea procede del snapshot de esa cita. No se deduce el contacto a partir de la ficha actual.
        target.innerHTML = result.citas.length
          ? `<ol>${result.citas
              .map(
                (cita) =>
                  `<li><strong>${esc(historical(cita.folio))}</strong><p>${esc(cita.fechaLocal || cita.inicioUtc)} · ${esc(cita.horaInicio || '')} · ${esc(cita.zonaHoraria)}</p><dl class="m4-detail-fields">${[
                    ['Contacto histórico', cita.nombreContacto],
                    ['Teléfono histórico', cita.telefonoContacto],
                    ['Servicio', cita.nombreServicio],
                    ['Profesional', cita.nombreProfesional],
                    ['Sucursal', cita.nombreSucursal],
                    ['Estado', cita.estado],
                    ['Costo histórico', cita.costoAceptado],
                  ]
                    .map(
                      ([label, value]) =>
                        `<div><dt>${label}</dt><dd>${esc(historical(value))}</dd></div>`,
                    )
                    .join('')}</dl></li>`,
              )
              .join('')}</ol>`
          : '<p>Sin citas registradas para esta ficha.</p>';
        target.insertAdjacentHTML('beforeend', pages(number, result.hayMas));
        target.querySelector('[data-customer-previous]').onclick = () =>
          void history(number - 1);
        target.querySelector('[data-customer-next]').onclick = () =>
          void history(number + 1);
        if (number > 1)
          target.querySelector('[data-customer-previous]').focus();
      } catch (error) {
        if (!active() || current !== historyGeneration) return;
        target.innerHTML = errorMarkup(error);
        target.querySelector('[data-customer-retry]')?.addEventListener('click', () =>
          void history(number)
        );
      }
    }
    await history();
  } catch (error) {
    if (!active()) return;
    dialog.querySelector('.dialog-body').innerHTML = errorMarkup(error);
    dialog.querySelector('[data-customer-retry]')?.addEventListener('click', () => void openCustomer(id, onChanged));
  }
}
export function openCustomerEditor(ficha, onChanged) {
  if (!canManageAppointments(user?.rol)) return;
  const revision = ++generation,
    identity = scope(),
    key = `customer:${identity}:${ficha?.id ?? 'new'}`,
    draft = agendaDraft(key);
  const dialog = panel(
    ficha ? 'Corregir ficha' : 'Nuevo cliente',
    `<form><div class="dialog-body"><p class="form-intro">${ficha ? 'Corrige los datos actuales de esta persona. Las citas anteriores no se modifican.' : 'Crea una ficha independiente. Dos personas pueden compartir el mismo teléfono.'}</p>${field('Nombre completo', 'nombreCompleto', draft?.nombreCompleto ?? ficha?.nombreCompleto ?? '', 'text', 'required autocomplete="off"')}${field('Teléfono', 'telefono', draft?.telefono ?? ficha?.telefono ?? '', 'tel', 'required autocomplete="off" inputmode="tel"')}<p class="field-hint">Nombre: hasta 150 caracteres. Teléfono: diez dígitos; puedes incluir +52, espacios o guiones.</p><p class="form-error" data-customer-error role="alert" tabindex="-1" hidden></p><p class="field-hint customer-notice" data-customer-uncertain hidden>El alta puede haberse guardado aunque no se reciba confirmación. Revisa el directorio antes de descartar este borrador y crear otra ficha.</p><button type="button" class="btn btn-light" data-customer-reload hidden>${ficha ? 'Releer ficha' : 'Revisar directorio'}</button>${!ficha ? '<button type="button" class="btn btn-light" data-customer-discard hidden>Descartar borrador</button>' : ''}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-customer-cancel>Cerrar</button><button type="submit" class="btn btn-primary">Guardar ficha</button></div></form>`,
  );
  const form = dialog.querySelector('form'),
    save = form.querySelector('[type="submit"]'),
    errorBox = form.querySelector('[data-customer-error]'),
    reload = form.querySelector('[data-customer-reload]');
  const active = () =>
    dialog.open && revision === generation && identity === scope();
  const mutation = createVersionedMutation(
    ficha?.version,
    (values) =>
      ficha ? client.update(ficha.id, values) : client.create(values),
    (result) =>
      result.negocioId === user?.negocioId &&
      (!ficha || result.version >= ficha.version),
  );
  mutation.state.stale = Boolean(
    draft && (draft.stale || draft.version !== ficha?.version),
  );
  const remember = () => {
    if (identity === scope())
      saveAgendaDraft(key, {
        nombreCompleto: form.elements.nombreCompleto.value,
        telefono: form.elements.telefono.value,
        version: ficha?.version,
        stale: mutation.state.busy || mutation.state.stale,
      });
  };
  function sync(message) {
    save.disabled = mutation.state.busy || mutation.state.stale;
    form.querySelectorAll('input').forEach((input) => {
      input.disabled = mutation.state.busy;
    });
    reload.hidden = !mutation.state.stale;
    if (!ficha) {
      form.querySelector('[data-customer-uncertain]').hidden =
        !mutation.state.stale;
      form.querySelector('[data-customer-discard]').hidden =
        !mutation.state.stale;
    }
    if (message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
  }
  sync(
    mutation.state.stale
      ? 'Hay un conflicto o un resultado sin confirmar. Revisa los datos antes de volver a guardar.'
      : '',
  );
  form.elements.nombreCompleto.focus();
  form.oninput = remember;
  // Una ficha abierta no cambia de versión silenciosamente: preserva lo escrito y exige relectura explícita.
  form.addEventListener('m4-record-obsolete', (event) => {
    mutation.state.stale = true; remember();
    sync(event.detail.kind === 'stale' ? 'La ficha cambió en otra sesión. Conservamos tu borrador; relee antes de guardar.' : 'No se pudo comprobar la versión vigente. Relee la ficha antes de guardar.');
  });
  if (ficha) watchRecord(form, { version: ficha.version, read: () => client.detail(ficha.id), active });
  dialog.addEventListener(
    'close',
    () => {
      if (form.isConnected) remember();
    },
    { once: true },
  );
  form.querySelector('[data-customer-cancel]').onclick = () => dialog.close();
  reload.onclick = () => {
    if (mutation.state.busy || !active()) return;
    if (ficha) {
      clearAgendaDraft(key);
      void openCustomer(ficha.id, onChanged);
    } else {
      dialog.close();
      void onChanged();
    }
  };
  if (!ficha)
    form.querySelector('[data-customer-discard]').onclick = () => {
      if (!mutation.state.busy && active()) {
        clearAgendaDraft(key);
        openCustomerEditor(null, onChanged);
      }
    };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!active() || mutation.state.busy || mutation.state.stale) return;
    const values = Object.fromEntries(new FormData(form));
    try {
      customerPayload({ ...values, version: ficha?.version }, Boolean(ficha));
    } catch (error) {
      sync(error.message);
      errorBox.focus();
      return;
    }
    const pending = mutation.submit(values);
    remember();
    sync();
    errorBox.hidden = true;
    await pending;
    if (!active()) return;
    if (mutation.state.result) {
      clearAgendaDraft(key);
      // Primero confirmar con la respuesta validada; después releer directorio, ficha e historial por ID.
      await onChanged();
      if (active()) await openCustomer(mutation.state.result.id, onChanged);
      return;
    }
    remember();
    sync(
      `${privateError(mutation.state.error).title}. ${privateError(mutation.state.error).message} Conservamos tu borrador.`,
    );
    errorBox.focus();
  };
}
