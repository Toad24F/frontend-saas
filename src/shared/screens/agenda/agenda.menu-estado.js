import { escaparHtml as esc } from '../../interfaz.componentes.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { etiquetasEstadoCita } from '../../aplicacion.datos.js';

export function botonMenuEstado(elemento) {
  return `data-agenda-menu-estado="${elemento.id}" aria-haspopup="menu" aria-expanded="false"`;
}

// Orientación visual; el servidor conserva la última palabra sobre tiempo, oferta y ocupaciones.
export function motivoOpcionEstado(elemento, siguiente, ahora = new Date()) {
  if (siguiente === elemento.estado) return 'Estado actual';
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: elemento.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(ahora).map((x) => [x.type, x.value]));
  const local = `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
  const inicio = elemento.inicioUtc ? new Date(elemento.inicioUtc).getTime() : NaN;
  const fin = elemento.finUtc ? new Date(elemento.finUtc).getTime() : NaN;
  const iniciado = Number.isFinite(inicio) ? inicio <= ahora.getTime() : `${elemento.fechaLocal}T${elemento.horaInicio.padEnd(8, ':00')}` <= local;
  const finalizado = Number.isFinite(fin) ? fin <= ahora.getTime() : `${elemento.fechaFinLocal}T${elemento.horaFin.padEnd(8, ':00')}` <= local;
  if (elemento.estado === 'cancelada' && iniciado) return 'La cita cancelada ya pasó';
  if (['completada', 'no_asistio'].includes(siguiente) && !finalizado) return 'Disponible al terminar la cita';
  return '';
}

// Dialog independiente: no reemplaza el detalle abierto ni su borrador/versionado.
export function confirmarCancelacion(elemento, motivo = '') {
  const anterior = document.activeElement;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'app-dialog agenda-dialogo-cancelacion';
  dialogo.setAttribute('aria-labelledby', 'agenda-cancel-title');
  dialogo.setAttribute('aria-describedby', 'agenda-cancel-description');
  dialogo.innerHTML = `<form method="dialog"><header class="dialog-header"><h2 id="agenda-cancel-title">¿Cancelar esta cita?</h2></header><div class="dialog-body"><p><strong>${esc(elemento.nombreContacto ?? 'Paciente')}</strong><br>${esc(elemento.fechaLocal)} · ${esc(elemento.horaInicio.slice(0, 5))} · ${esc(elemento.zonaHoraria)}</p><p>${esc(elemento.nombreServicio ?? '')}${elemento.nombreSucursal ? ` · ${esc(elemento.nombreSucursal)}` : ''}</p><p id="agenda-cancel-description">La cita cambiará a Cancelada y liberará el horario. Se conservará en el historial.</p><label class="form-label" for="agenda-cancel-reason">Motivo de cancelación <span class="optional">(opcional)</span></label><textarea class="form-control" id="agenda-cancel-reason" name="motivo" rows="2" maxlength="2000">${esc(motivo ?? '')}</textarea></div><div class="dialog-footer"><button class="btn btn-light" type="submit" value="keep" autofocus>Conservar cita</button><button class="btn btn-danger-soft" type="submit" value="confirm">Sí, cancelar cita</button></div></form>`;
  document.body.append(dialogo);
  return new Promise((resolver) => {
    const abort = () => dialogo.close('keep');
    const padre = anterior?.closest('dialog');
    padre?.addEventListener('close', abort, { once: true });
    window.addEventListener('cita-sesion-expirada', abort, { once: true });
    dialogo.addEventListener('close', () => {
      const resultado = dialogo.returnValue === 'confirm' ? { motivo: dialogo.querySelector('textarea').value } : null;
      padre?.removeEventListener('close', abort);
      window.removeEventListener('cita-sesion-expirada', abort);
      dialogo.remove();
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
      resolver(resultado);
    }, { once: true });
    dialogo.showModal();
  });
}

// Cada modo aporta lecturas y escrituras propias; nunca se usa el catálogo demo en modo conectado.
export function instalarMenuEstado({ active: activo, read: leer, change: cambiar, openDetail: abrirDetalle, errorText: textoError, changed: alCambiar, now: ahora = () => new Date() }) {
  let vigente;
  let pulsacion, clicSuprimido;
  const cancelarPulsacion = () => { if (pulsacion) clearTimeout(pulsacion.timer); pulsacion = null; };
  const cerrar = (focus = false) => {
    const menu = vigente;
    if (!menu) return;
    vigente = null;
    menu.anchor.setAttribute('aria-expanded', 'false');
    menu.el.remove();
    if (focus) (menu.anchor.isConnected ? menu.anchor : document.querySelector(`[data-agenda-menu-estado="${menu.id}"]`))?.focus({ preventScroll: true });
  };
  async function mostrar(ancla, id, punto) {
    cerrar();
    const el = document.createElement('div');
    el.className = 'agenda-menu-estado'; el.setAttribute('popover', 'manual'); el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Cambiar estado de la cita'); el.tabIndex = -1;
    el.innerHTML = '<p role="status">Consultando cita…</p>';
    document.body.append(el);
    const entrada = { el, anchor: ancla, id, busy: false, scope: activo() };
    vigente = entrada; ancla.setAttribute('aria-expanded', 'true');
    el.addEventListener('toggle', (evento) => { if (evento.newState === 'closed' && vigente === entrada) cerrar(true); });
    el.showPopover();
    const rectangulo = ancla.getBoundingClientRect();
    const posicion = () => {
      const contenedor = el.getBoundingClientRect();
      el.style.left = `${Math.max(8, Math.min(punto?.x ?? rectangulo.left, innerWidth - contenedor.width - 8))}px`;
      el.style.top = `${Math.max(8, Math.min(punto?.y ?? rectangulo.bottom + 4, innerHeight - contenedor.height - 8))}px`;
    };
    posicion(); el.focus({ preventScroll: true });
    const valido = () => vigente === entrada && activo() === entrada.scope && Boolean(entrada.scope);
    const fallar = (error) => {
      el.innerHTML = `<p class="agenda-error-menu" role="alert">${esc(textoError(error))}</p><button role="menuitem" type="button" data-menu-recargar>Actualizar cita</button><button role="menuitem" type="button" data-menu-detalle>Ver detalle</button>`;
      el.querySelector('[data-menu-recargar]').onclick = () => void mostrar(ancla, id, punto);
      el.querySelector('[data-menu-detalle]').onclick = () => { cerrar(true); abrirDetalle(id); };
      posicion(); el.querySelector('button').focus({ preventScroll: true });
    };
    try {
      const detalle = await leer(id);
      if (!valido()) { if (vigente === entrada) cerrar(); return; }
      if (!detalle || detalle.id !== id || !etiquetasEstadoCita[detalle.estado]) throw new Error('Detalle inválido');
      el.innerHTML = `<p class="agenda-titulo-menu">${esc(detalle.nombreContacto ?? 'Paciente')}<small>${esc(detalle.fechaLocal)} · ${esc(detalle.horaInicio.slice(0, 5))}</small></p>${Object.entries(etiquetasEstadoCita).map(([valor, etiqueta]) => {
        const motivo = motivoOpcionEstado(detalle, valor, ahora());
        return `<button type="button" role="menuitemradio" aria-checked="${valor === detalle.estado}" data-siguiente-estado="${valor}" ${motivo ? 'disabled' : ''}><span class="legend-dot agenda-indicador-estado ${valor}"></span><span>${etiqueta}${motivo ? `<small>${esc(motivo)}</small>` : ''}</span>${valor === detalle.estado ? renderIcono('check') : ''}</button>`;
      }).join('')}<button role="menuitem" type="button" data-menu-detalle>Ver detalle de la cita ${renderIcono('chevron')}</button>`;
      posicion(); el.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
      el.querySelector('[data-menu-detalle]').onclick = () => { cerrar(true); abrirDetalle(id); };
      for (const button of el.querySelectorAll('[data-siguiente-estado]')) button.onclick = async () => {
        if (!valido() || entrada.busy) return;
        entrada.busy = true;
        try {
          let motivo = null;
          if (button.dataset.siguienteEstado === 'cancelada') {
            el.style.visibility = 'hidden';
            const confirmado = await confirmarCancelacion(detalle);
            el.style.visibility = '';
            if (valido()) button.focus({ preventScroll: true });
            if (!confirmado || !valido()) return;
            motivo = confirmado.motivo;
          }
          el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          el.setAttribute('aria-busy', 'true');
          el.insertAdjacentHTML('beforeend', '<p role="status">Guardando estado…</p>');
          const resultado = await cambiar(detalle, button.dataset.siguienteEstado, motivo);
          if (activo() !== entrada.scope || !activo()) return;
          const restaurarFoco = vigente === entrada;
          if (restaurarFoco) cerrar(true);
          await alCambiar(resultado, { restoreFocus: restaurarFoco });
        } catch (error) {
          if (valido()) fallar(error);
        } finally { entrada.busy = false; el.removeAttribute('aria-busy'); }
      };
    } catch (error) { if (valido()) fallar(error); }
  }
  const objetivo = (evento) => evento.target.closest('[data-agenda-menu-estado]');
  document.addEventListener('click', (evento) => {
    if (!activo()) return;
    const button = objetivo(evento);
    if (button && clicSuprimido?.anchor === button && performance.now() < clicSuprimido.until) {
      evento.preventDefault(); evento.stopImmediatePropagation(); clicSuprimido = null; return;
    }
    if (button) cerrar();
  }, true);
  document.addEventListener('pointerdown', (evento) => {
    if (vigente && !vigente.el.contains(evento.target) && !evento.target.closest('[data-agenda-menu-estado], .agenda-dialogo-cancelacion')) cerrar();
    cancelarPulsacion();
    if (!activo() || evento.pointerType !== 'touch' || !evento.isPrimary) return;
    const ancla = objetivo(evento);
    if (!ancla) return;
    const entrada = { anchor: ancla, pointerId: evento.pointerId, x: evento.clientX, y: evento.clientY };
    pulsacion = entrada;
    entrada.timer = setTimeout(() => {
      if (pulsacion !== entrada || !activo() || !ancla.isConnected) return;
      clicSuprimido = { anchor: ancla, until: Infinity };
      cancelarPulsacion();
      void mostrar(ancla, Number(ancla.dataset.agendaMenuEstado), { x: entrada.x, y: entrada.y });
    }, 500);
  });
  document.addEventListener('pointermove', (evento) => {
    if (pulsacion && evento.pointerId === pulsacion.pointerId && Math.hypot(evento.clientX - pulsacion.x, evento.clientY - pulsacion.y) > 10) cancelarPulsacion();
  });
  for (const tipo of ['pointerup', 'pointercancel']) document.addEventListener(tipo, () => {
    cancelarPulsacion();
    if (clicSuprimido) clicSuprimido.until = performance.now() + 800;
  });
  document.addEventListener('scroll', cancelarPulsacion, true);
  document.addEventListener('contextmenu', (evento) => {
    if (!activo()) return;
    const tarjeta = evento.target.closest('[data-agenda-cita], [data-cita]');
    const disparador = objetivo(evento) || (tarjeta && document.querySelector(`[data-agenda-menu-estado="${tarjeta.dataset.agendaCita || tarjeta.dataset.cita}"]`));
    if (!disparador) return;
    if (clicSuprimido?.anchor === disparador && performance.now() < clicSuprimido.until) { evento.preventDefault(); return; }
    cancelarPulsacion();
    evento.preventDefault(); void mostrar(disparador, Number(disparador.dataset.agendaMenuEstado), { x: evento.clientX, y: evento.clientY });
  });
  document.addEventListener('keydown', (evento) => {
    if (vigente && !activo()) { cerrar(); return; }
    if (vigente && !document.querySelector('.agenda-dialogo-cancelacion[open]') && ['ArrowDown','ArrowUp','Home','End','Escape','Tab'].includes(evento.key)) {
      if (evento.key === 'Escape') { evento.preventDefault(); cerrar(true); return; }
      if (evento.key === 'Tab') { cerrar(true); return; }
      evento.preventDefault();
      const botones = [...vigente.el.querySelectorAll('button:not(:disabled)')];
      const indice = botones.indexOf(document.activeElement);
      (evento.key === 'Home' ? botones[0] : evento.key === 'End' ? botones.at(-1) : botones[(indice + (evento.key === 'ArrowUp' ? -1 : 1) + botones.length) % botones.length])?.focus();
    } else if (activo() && (evento.key === 'ContextMenu' || (evento.shiftKey && evento.key === 'F10'))) {
      const tarjeta = evento.target.closest('[data-agenda-cita], [data-cita]');
      const disparador = objetivo(evento) || (tarjeta && document.querySelector(`[data-agenda-menu-estado="${tarjeta.dataset.agendaCita || tarjeta.dataset.cita}"]`));
      if (disparador) { evento.preventDefault(); void mostrar(disparador, Number(disparador.dataset.agendaMenuEstado)); }
    }
  });
  window.addEventListener('cita-sesion-expirada', () => { cancelarPulsacion(); cerrar(); });
  window.addEventListener('popstate', () => { cancelarPulsacion(); cerrar(); });
  document.addEventListener('click', (evento) => { if (evento.target.closest('[data-nav], [data-agenda-vista], [data-agenda-mover], [data-agenda-fecha], [data-agenda-hoy], [data-agenda-dia-demo]')) cerrar(); });
}
