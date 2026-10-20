import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAnnouncement, createAnnouncer, focusPublicControl } from '../src/connected/public/accessibility.js';
import { renderSelection } from '../src/connected/public/selection-view.js';
import { renderBooking } from '../src/connected/public/booking-view.js';

// La región persiste entre renders: comprobamos cambios de texto, no un motor
// de voz simulado. La lectura real depende del navegador y lector de pantalla.
test('T115: restaurar foco/cursor desplaza el control a la vista sin animación', () => {
  const calls = [];
  const target = { focus() { calls.push('focus'); }, setSelectionRange(...range) { calls.push(range); }, scrollIntoView(options) { calls.push(options); } };
  focusPublicControl(target, [2, 4]); focusPublicControl(null);
  assert.deepEqual(calls, ['focus', [2, 4], { block: 'nearest', inline: 'nearest', behavior: 'instant' }]);
});

test('T115: anuncia carga, opciones, vacío y error sin leer datos personales', () => {
  const state = { phase: 'selection', step: 0, query: { status: 'ready', message: '' }, options: { servicios: [1, 2] } };
  assert.match(publicAnnouncement(state), /2.*disponibles/);
  for (const status of ['loading', 'empty', 'error', 'invalid']) {
    assert.equal(publicAnnouncement({ ...state, query: { status, message: `Estado ${status}` } }), `Estado ${status}`);
  }
  assert.match(publicAnnouncement({ ...state, step: 3, slots: [1] }), /1.*disponible/);
  const form = { phase: 'form', contact: { nombre: 'Privado', telefono: '6141234567' }, contactErrors: { nombre: 'Revisa el nombre', telefono: 'Revisa el teléfono' } };
  assert.match(publicAnnouncement(form), /Revisa el nombre.*Revisa el teléfono/);
  assert.doesNotMatch(publicAnnouncement(form), /Privado|6141234567/);
  assert.match(publicAnnouncement({ phase: 'result' }), /pendiente/i);
  assert.match(publicAnnouncement({ phase: 'uncertain', notice: 'Comprueba tu envío' }), /Comprueba tu envío/);
});

test('T115: región estable no repite avisos idénticos ni incorpora HTML', () => {
  const writes = [];
  const node = { set textContent(value) { writes.push(value); } };
  const announce = createAnnouncer(node);
  announce('Cargando'); announce('Cargando'); announce('<b>Listo</b>'); announce(''); announce('Cargando');
  assert.deepEqual(writes, ['Cargando', '<b>Listo</b>', '', 'Cargando']);
});

test('T115: fecha inválida y campos tienen etiquetas y referencias de ayuda/error', () => {
  const html = renderSelection({ step: 3, selection: { date: '', slot: null }, query: { status: 'invalid', message: 'Elige una fecha' }, options: { servicios: [], sucursales: [], profesionales: [] }, slots: [] });
  assert.match(html, /for="public-date"/);
  assert.match(html, /id="public-date"[^>]*aria-invalid="true"/);
  assert.match(html, /aria-describedby="public-zone selection-status"/);
  const form = renderBooking({ phase: 'form', selection: { date: '2026-10-20', slot: { inicioUtc: '2026-10-20T17:00:00Z' } }, hold: { zonaHoraria: 'America/Mazatlan', costoAceptado: '450.00' }, holdStatus: 'active', remainingMs: 10000, contact: {}, contactErrors: { telefono: 'Revisa el teléfono' } });
  for (const field of ['nombre', 'telefono', 'notas']) {
    assert.ok(form.includes(`for="contact-${field}"`));
    assert.ok(form.includes(`id="contact-${field}-error"`));
  }
  assert.match(form, /role="timer" aria-live="off"/);
  assert.match(form, /data-review-contact/);
});
