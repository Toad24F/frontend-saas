import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { listarRegistros, obtenerRecurso, ampliarDatosCita } from '../../../shared/aplicacion.datos.js';
import { renderCampo, abrirFormulario } from '../../../shared/formularios.componentes.js';
import { validarContactoDemo } from '../../disponibilidad.motor.js';
import { guardarRegistroCatalogo } from '../../../shared/screens/catalogos/catalogos.acciones.js';
import { corregirClienteDemo } from '../../clientes.horario.js';
import { panelAgenda } from '../../../shared/screens/agenda/agenda.paneles.js';
import { escaparHtml as esc } from '../../../shared/interfaz.componentes.js';
import '../../../shared/screens/agenda/agenda.refinamientos.css';
export function nuevoCliente() {
  abrirFormulario(
    'Nuevo cliente',
    `${renderCampo('Nombre completo', 'nombreCompleto', '', 'text', 'required maxlength="150"')}${renderCampo('Teléfono de WhatsApp', 'telefono', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"')}<p class="ayuda-campo">Usa datos ficticios en esta demostración.</p>`,
    (formulario) => {
      validarContactoDemo(formulario.get('nombreCompleto'), formulario.get('telefono'));
      // El teléfono no identifica por sí solo a una persona: cada alta crea una ficha independiente.
      guardarRegistroCatalogo('clients', null, {
        name: formulario.get('nombreCompleto').trim(),
        phone: formulario.get('telefono'),
      });
    }, false, { panelLateral: true },
  );
}

// Ficha ficticia con el mismo panel lateral y separación entre datos actuales e históricos del producto conectado.
export function abrirFichaClienteDemo(id) {
  const cliente = obtenerRecurso('clients', id, estadoAplicacion.negocioId);
  const citas = listarRegistros('appointments', estadoAplicacion.negocioId).filter((cita) => cita.clientId === id);
  const dialogo = panelAgenda('Ficha del cliente', `<div class="dialogo-cuerpo"><h3>${esc(cliente.name)}</h3><p>${esc(cliente.phone)} · Cliente #${id}</p><button class="btn btn-primary" data-ficha-demo-corregir>Corregir ficha</button><section class="historial-cliente"><h3>Historial de citas</h3><p class="ayuda-campo">Solo datos ficticios. Las correcciones no alteran los contactos anteriores.</p>${citas.length ? `<ol>${citas.map((cita) => `<li><strong>${esc(cita.folio)}</strong><p>${esc(cita.date)} · ${esc(cita.start)} · ${esc(ampliarDatosCita(cita).client.name)}</p></li>`).join('')}</ol>` : '<p>Sin citas registradas para esta ficha.</p>'}</section></div>`);
  dialogo.querySelector('[data-ficha-demo-corregir]').onclick = () => abrirFormulario('Corregir ficha', `${renderCampo('Nombre completo', 'nombreCompleto', cliente.name, 'text', 'required maxlength="150"')}${renderCampo('Teléfono', 'telefono', cliente.phone, 'tel', 'required pattern="[0-9]{10}" maxlength="10"')}<p class="ayuda-campo">Datos ficticios. Las citas anteriores conservan su contacto.</p>`, (valores) => corregirClienteDemo(id, estadoAplicacion.negocioId, { nombreCompleto: valores.get('nombreCompleto'), telefono: valores.get('telefono') }), false, { panelLateral: true });
}
