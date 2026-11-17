import { escape as esc } from '../../ui.js';
import { icon } from '../../icons.js';
import { statuses } from '../../data.js';

export function stateMenuTrigger(item) {
  return `data-agenda-state-menu="${item.id}" aria-haspopup="menu" aria-expanded="false"`;
}

// Orientación visual; el servidor conserva la última palabra sobre tiempo, oferta y ocupaciones.
export function stateOptionReason(item, next, now = new Date()) {
  if (next === item.estado) return 'Estado actual';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: item.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  const start = item.inicioUtc ? new Date(item.inicioUtc).getTime() : NaN;
  const end = item.finUtc ? new Date(item.finUtc).getTime() : NaN;
  const started = Number.isFinite(start) ? start <= now.getTime() : `${item.fechaLocal}T${item.horaInicio.padEnd(8, ':00')}` <= local;
  const ended = Number.isFinite(end) ? end <= now.getTime() : `${item.fechaFinLocal}T${item.horaFin.padEnd(8, ':00')}` <= local;
  if (item.estado === 'cancelada' && started) return 'La cita cancelada ya pasó';
  if (['completada', 'no_asistio'].includes(next) && !ended) return 'Disponible al terminar la cita';
  return '';
}

// Dialog independiente: no reemplaza el detalle abierto ni su borrador/versionado.
export function confirmCancellation(item, motivo = '') {
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog agenda-cancel-dialog';
  dialog.setAttribute('aria-labelledby', 'agenda-cancel-title');
  dialog.setAttribute('aria-describedby', 'agenda-cancel-description');
  dialog.innerHTML = `<form method="dialog"><header class="dialog-header"><h2 id="agenda-cancel-title">¿Cancelar esta cita?</h2></header><div class="dialog-body"><p><strong>${esc(item.nombreContacto ?? 'Paciente')}</strong><br>${esc(item.fechaLocal)} · ${esc(item.horaInicio.slice(0, 5))} · ${esc(item.zonaHoraria)}</p><p>${esc(item.nombreServicio ?? '')}${item.nombreSucursal ? ` · ${esc(item.nombreSucursal)}` : ''}</p><p id="agenda-cancel-description">La cita cambiará a Cancelada y liberará el horario. Se conservará en el historial.</p><label class="form-label" for="agenda-cancel-reason">Motivo de cancelación <span class="optional">(opcional)</span></label><textarea class="form-control" id="agenda-cancel-reason" name="motivo" rows="2" maxlength="2000">${esc(motivo ?? '')}</textarea></div><div class="dialog-footer"><button class="btn btn-light" type="submit" value="keep" autofocus>Conservar cita</button><button class="btn btn-danger-soft" type="submit" value="confirm">Sí, cancelar cita</button></div></form>`;
  document.body.append(dialog);
  return new Promise((resolve) => {
    const abort = () => dialog.close('keep');
    const parent = previous?.closest('dialog');
    parent?.addEventListener('close', abort, { once: true });
    window.addEventListener('cita-session-expired', abort, { once: true });
    dialog.addEventListener('close', () => {
      const result = dialog.returnValue === 'confirm' ? { motivo: dialog.querySelector('textarea').value } : null;
      parent?.removeEventListener('close', abort);
      window.removeEventListener('cita-session-expired', abort);
      dialog.remove();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      resolve(result);
    }, { once: true });
    dialog.showModal();
  });
}

// Cada modo aporta lecturas y escrituras propias; nunca se usa el catálogo demo en modo conectado.
export function installStateMenu({ active, read, change, openDetail, errorText, changed, now = () => new Date() }) {
  let current;
  let press, suppressedClick;
  const cancelPress = () => { if (press) clearTimeout(press.timer); press = null; };
  const close = (focus = false) => {
    const menu = current;
    if (!menu) return;
    current = null;
    menu.anchor.setAttribute('aria-expanded', 'false');
    menu.el.remove();
    if (focus) (menu.anchor.isConnected ? menu.anchor : document.querySelector(`[data-agenda-state-menu="${menu.id}"]`))?.focus({ preventScroll: true });
  };
  async function show(anchor, id, point) {
    close();
    const el = document.createElement('div');
    el.className = 'agenda-state-menu'; el.setAttribute('popover', 'manual'); el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Cambiar estado de la cita'); el.tabIndex = -1;
    el.innerHTML = '<p role="status">Consultando cita…</p>';
    document.body.append(el);
    const entry = { el, anchor, id, busy: false, scope: active() };
    current = entry; anchor.setAttribute('aria-expanded', 'true');
    el.addEventListener('toggle', (event) => { if (event.newState === 'closed' && current === entry) close(true); });
    el.showPopover();
    const rect = anchor.getBoundingClientRect();
    const position = () => {
      const box = el.getBoundingClientRect();
      el.style.left = `${Math.max(8, Math.min(point?.x ?? rect.left, innerWidth - box.width - 8))}px`;
      el.style.top = `${Math.max(8, Math.min(point?.y ?? rect.bottom + 4, innerHeight - box.height - 8))}px`;
    };
    position(); el.focus({ preventScroll: true });
    const valid = () => current === entry && active() === entry.scope && Boolean(entry.scope);
    const fail = (error) => {
      el.innerHTML = `<p class="agenda-menu-error" role="alert">${esc(errorText(error))}</p><button role="menuitem" type="button" data-menu-reload>Actualizar cita</button><button role="menuitem" type="button" data-menu-detail>Ver detalle</button>`;
      el.querySelector('[data-menu-reload]').onclick = () => void show(anchor, id, point);
      el.querySelector('[data-menu-detail]').onclick = () => { close(true); openDetail(id); };
      position(); el.querySelector('button').focus({ preventScroll: true });
    };
    try {
      const detail = await read(id);
      if (!valid()) { if (current === entry) close(); return; }
      if (!detail || detail.id !== id || !statuses[detail.estado]) throw new Error('Detalle inválido');
      el.innerHTML = `<p class="agenda-menu-title">${esc(detail.nombreContacto ?? 'Paciente')}<small>${esc(detail.fechaLocal)} · ${esc(detail.horaInicio.slice(0, 5))}</small></p>${Object.entries(statuses).map(([value, label]) => {
        const reason = stateOptionReason(detail, value, now());
        return `<button type="button" role="menuitemradio" aria-checked="${value === detail.estado}" data-next-state="${value}" ${reason ? 'disabled' : ''}><span class="legend-dot agenda-state-dot ${value}"></span><span>${label}${reason ? `<small>${esc(reason)}</small>` : ''}</span>${value === detail.estado ? icon('check') : ''}</button>`;
      }).join('')}<button role="menuitem" type="button" data-menu-detail>Ver detalle de la cita ${icon('chevron')}</button>`;
      position(); el.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
      el.querySelector('[data-menu-detail]').onclick = () => { close(true); openDetail(id); };
      for (const button of el.querySelectorAll('[data-next-state]')) button.onclick = async () => {
        if (!valid() || entry.busy) return;
        entry.busy = true;
        try {
          let motivo = null;
          if (button.dataset.nextState === 'cancelada') {
            el.style.visibility = 'hidden';
            const confirmed = await confirmCancellation(detail);
            el.style.visibility = '';
            if (valid()) button.focus({ preventScroll: true });
            if (!confirmed || !valid()) return;
            motivo = confirmed.motivo;
          }
          el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          el.setAttribute('aria-busy', 'true');
          el.insertAdjacentHTML('beforeend', '<p role="status">Guardando estado…</p>');
          const result = await change(detail, button.dataset.nextState, motivo);
          if (active() !== entry.scope || !active()) return;
          const restoreFocus = current === entry;
          if (restoreFocus) close(true);
          await changed(result, { restoreFocus });
        } catch (error) {
          if (valid()) fail(error);
        } finally { entry.busy = false; el.removeAttribute('aria-busy'); }
      };
    } catch (error) { if (valid()) fail(error); }
  }
  const target = (event) => event.target.closest('[data-agenda-state-menu]');
  document.addEventListener('click', (event) => {
    if (!active()) return;
    const button = target(event);
    if (button && suppressedClick?.anchor === button && performance.now() < suppressedClick.until) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressedClick = null; return;
    }
    if (button) close();
  }, true);
  document.addEventListener('pointerdown', (event) => {
    if (current && !current.el.contains(event.target) && !event.target.closest('[data-agenda-state-menu], .agenda-cancel-dialog')) close();
    cancelPress();
    if (!active() || event.pointerType !== 'touch' || !event.isPrimary) return;
    const anchor = target(event);
    if (!anchor) return;
    const entry = { anchor, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    press = entry;
    entry.timer = setTimeout(() => {
      if (press !== entry || !active() || !anchor.isConnected) return;
      suppressedClick = { anchor, until: Infinity };
      cancelPress();
      void show(anchor, Number(anchor.dataset.agendaStateMenu), { x: entry.x, y: entry.y });
    }, 500);
  });
  document.addEventListener('pointermove', (event) => {
    if (press && event.pointerId === press.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancelPress();
  });
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => {
    cancelPress();
    if (suppressedClick) suppressedClick.until = performance.now() + 800;
  });
  document.addEventListener('scroll', cancelPress, true);
  document.addEventListener('contextmenu', (event) => {
    if (!active()) return;
    const card = event.target.closest('[data-m4-appointment], [data-appointment]');
    const trigger = target(event) || (card && document.querySelector(`[data-agenda-state-menu="${card.dataset.m4Appointment || card.dataset.appointment}"]`));
    if (!trigger) return;
    if (suppressedClick?.anchor === trigger && performance.now() < suppressedClick.until) { event.preventDefault(); return; }
    cancelPress();
    event.preventDefault(); void show(trigger, Number(trigger.dataset.agendaStateMenu), { x: event.clientX, y: event.clientY });
  });
  document.addEventListener('keydown', (event) => {
    if (current && !active()) { close(); return; }
    if (current && !document.querySelector('.agenda-cancel-dialog[open]') && ['ArrowDown','ArrowUp','Home','End','Escape','Tab'].includes(event.key)) {
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      if (event.key === 'Tab') { close(true); return; }
      event.preventDefault();
      const buttons = [...current.el.querySelectorAll('button:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement);
      (event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[(index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length])?.focus();
    } else if (active() && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
      const card = event.target.closest('[data-m4-appointment], [data-appointment]');
      const trigger = target(event) || (card && document.querySelector(`[data-agenda-state-menu="${card.dataset.m4Appointment || card.dataset.appointment}"]`));
      if (trigger) { event.preventDefault(); void show(trigger, Number(trigger.dataset.agendaStateMenu)); }
    }
  });
  window.addEventListener('cita-session-expired', () => { cancelPress(); close(); });
  window.addEventListener('popstate', () => { cancelPress(); close(); });
  document.addEventListener('click', (event) => { if (event.target.closest('[data-nav], [data-m4-view], [data-m4-move], [data-m4-date], [data-m4-today], [data-day]')) close(); });
}
