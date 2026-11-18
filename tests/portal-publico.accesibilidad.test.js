import test from 'node:test';
import assert from 'node:assert/strict';
import { anuncioPortal, crearAnunciador, enfocarControlPortal } from '../src/connected/portal-publico/portal.accesibilidad.js';
import { renderSeleccion } from '../src/connected/portal-publico/seleccion.vista.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';

// La región persiste entre renders: comprobamos cambios de texto, no un motor
// de voz simulado. La lectura real depende del navegador y lector de pantalla.
test('T115: restaurar foco/cursor desplaza el control a la vista sin animación', () => {
  const llamadas = [];
  const destino = { focus() { llamadas.push('focus'); }, setSelectionRange(...rango) { llamadas.push(rango); }, scrollIntoView(opciones) { llamadas.push(opciones); } };
  enfocarControlPortal(destino, [2, 4]); enfocarControlPortal(null);
  assert.deepEqual(llamadas, ['focus', [2, 4], { block: 'nearest', inline: 'nearest', behavior: 'instant' }]);
});

test('T115: anuncia carga, opciones, vacío y error sin leer datos personales', () => {
  const estado = { fase: 'seleccion', paso: 0, consulta: { estado: 'lista', mensaje: '' }, opciones: { servicios: [1, 2] } };
  assert.match(anuncioPortal(estado), /2.*disponibles/);
  for (const estadoConsulta of ['cargando', 'vacia', 'error', 'invalida']) {
    assert.equal(anuncioPortal({ ...estado, consulta: { estado: estadoConsulta, mensaje: `Estado ${estadoConsulta}` } }), `Estado ${estadoConsulta}`);
  }
  assert.match(anuncioPortal({ ...estado, paso: 3, horarios: [1] }), /1.*disponible/);
  const formulario = { fase: 'formulario', contacto: { nombre: 'Privado', telefono: '6141234567' }, erroresContacto: { nombre: 'Revisa el nombre', telefono: 'Revisa el teléfono' } };
  assert.match(anuncioPortal(formulario), /Revisa el nombre.*Revisa el teléfono/);
  assert.doesNotMatch(anuncioPortal(formulario), /Privado|6141234567/);
  assert.match(anuncioPortal({ fase: 'resultado' }), /pendiente/i);
  assert.match(anuncioPortal({ fase: 'incierto', aviso: 'Comprueba tu envío' }), /Comprueba tu envío/);
});

test('T115: región estable no repite avisos idénticos ni incorpora HTML', () => {
  const escrituras = [];
  const nodo = { set textContent(valor) { escrituras.push(valor); } };
  const anunciar = crearAnunciador(nodo);
  anunciar('Cargando'); anunciar('Cargando'); anunciar('<b>Listo</b>'); anunciar(''); anunciar('Cargando');
  assert.deepEqual(escrituras, ['Cargando', '<b>Listo</b>', '', 'Cargando']);
});

test('T115: fecha y campos tienen etiquetas y referencias de ayuda/error', () => {
  const html = renderSeleccion({ paso: 3, seleccion: { fecha: '', horario: null }, consulta: { estado: 'invalida', mensaje: 'Elige una fecha' }, opciones: { servicios: [], sucursales: [], profesionales: [] }, horarios: [] });
  assert.match(html, /class="portal-fecha-etiqueta"/);
  assert.match(html, /id="portal-estado-seleccion"[^>]*>Elige una fecha/);
  const formulario = renderReserva({ fase: 'formulario', seleccion: { fecha: '2026-10-20', horario: { inicioUtc: '2026-10-20T17:00:00Z' } }, apartado: { zonaHoraria: 'America/Mazatlan', costo: '450.00' }, estadoApartado: 'vigente', milisegundosRestantes: 10000, contacto: {}, erroresContacto: { telefono: 'Revisa el teléfono' } });
  for (const campo of ['nombre', 'telefono', 'notas']) {
    assert.ok(formulario.includes(`for="portal-contacto-${campo}"`));
    assert.ok(formulario.includes(`id="portal-contacto-${campo}-error"`));
  }
  assert.match(formulario, /role="timer" aria-live="off"/);
  assert.match(formulario, /data-revisar-contacto/);
});
