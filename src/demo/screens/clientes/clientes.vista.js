import { state } from '../../../shared/app.js';
import { list, formatDate } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { escape as esc, avatar, pageHead, button, empty } from '../../../shared/ui.js';
import './clientes.estilos.css';
import '../../../shared/screens/clientes/clientes.estilos.css';
export function clientes() {
  const fichas = list('clients', state.tenantId).filter((cliente) =>
    `${cliente.name} ${cliente.phone}`.toLowerCase().includes(state.search.toLowerCase()),
  );
  return `${pageHead('Clientes', 'Conoce a las personas que confían en tu negocio.', button('Nuevo cliente', 'nuevo-cliente'))}<section class="surface directorio-clientes"><div class="section-heading"><div class="section-title-line"><h2>Tu directorio</h2><span class="count-badge">${list('clients', state.tenantId).length}</span></div><label class="search-field busqueda-tabla-clientes">${icon('search')}<input id="busqueda-directorio-demo" aria-label="Buscar cliente" placeholder="Nombre o teléfono..." value="${esc(state.search)}" type="search"/></label></div>${
    fichas.length
      ? `<div class="table-responsive directorio-tabla"><table class="table app-table align-middle"><thead><tr><th>Nombre completo</th><th>WhatsApp</th><th>Citas</th><th>Última visita</th><th>Acciones</th></tr></thead><tbody>${fichas
          .map((cliente, indice) => {
            const citas = list('appointments', state.tenantId).filter(
              (cita) => cita.clientId === cliente.id,
            );
            const ultimaVisita = citas
              .filter((cita) => cita.status === 'completada')
              .sort((primera, segunda) => segunda.date.localeCompare(primera.date))[0];
            return `<tr><td><div class="person-cell">${avatar(
              cliente.name
                .split(' ')
                .map((palabra) => palabra[0])
                .slice(0, 2)
                .join(''),
              ['peach', 'mint', 'lavender', 'sky'][indice % 4],
            )}<span><strong>${esc(cliente.name)}</strong><small>Cliente #${String(cliente.id).padStart(3, '0')}</small></span></div></td><td>${icon('message', 'subtle-icon')} ${esc(cliente.phone)}</td><td>${citas.length} ${citas.length === 1 ? 'cita' : 'citas'}</td><td>${ultimaVisita ? formatDate(ultimaVisita.date, { day: 'numeric', month: 'short', year: 'numeric' }) : '<span class="text-muted">Sin visitas registradas</span>'}</td><td><button class="text-button" data-ficha-demo-abrir="${cliente.id}">Ver ficha ${icon('chevron')}</button></td></tr>`;
          })
          .join('')}</tbody></table></div>`
      : empty(
          'No encontramos ese cliente',
          'Intenta buscar por otro nombre o teléfono.',
        )
  }<div class="directorio-tarjetas">${fichas.map((cliente) => `<article><h3>${esc(cliente.name)}</h3><p>Cliente #${cliente.id} · ${esc(cliente.phone)}</p><button class="text-button" data-ficha-demo-abrir="${cliente.id}">Ver ficha ${icon('chevron')}</button></article>`).join('')}</div><div class="table-footer">${fichas.length} clientes · Datos de demostración</div></section>`;
}
