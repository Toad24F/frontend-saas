import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../../shared/app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../../shared/ui.js';
import './style.css';
export function clients() {
  const data = list('clients', state.tenantId).filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(state.search.toLowerCase()),
  );
  return `${pageHead('Clientes', 'Conoce a las personas que confían en tu negocio.', button('Nuevo cliente', 'new-client'))}<section class="surface"><div class="section-heading"><div class="section-title-line"><h2>Tu directorio</h2><span class="count-badge">${list('clients', state.tenantId).length}</span></div><label class="search-field table-search">${icon('search')}<input id="directory-search" aria-label="Buscar cliente" placeholder="Nombre o teléfono..." value="${esc(state.search)}" type="search"/></label></div>${
    data.length
      ? `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Nombre completo</th><th>WhatsApp</th><th>Citas</th><th>Última visita</th><th>Acciones</th></tr></thead><tbody>${data
          .map((c, i) => {
            const apps = list('appointments', state.tenantId).filter(
              (a) => a.clientId === c.id,
            );
            const last = apps
              .filter((a) => a.status === 'completada')
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            return `<tr><td><div class="person-cell">${avatar(
              c.name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join(''),
              ['peach', 'mint', 'lavender', 'sky'][i % 4],
            )}<span><strong>${esc(c.name)}</strong><small>Cliente #${String(c.id).padStart(3, '0')}</small></span></div></td><td>${icon('message', 'subtle-icon')} ${esc(c.phone)}</td><td>${apps.length} ${apps.length === 1 ? 'cita' : 'citas'}</td><td>${last ? formatDate(last.date, { day: 'numeric', month: 'short', year: 'numeric' }) : '<span class="text-muted">Sin visitas registradas</span>'}</td><td><button class="text-button" data-client="${c.id}">Ver ficha ${icon('chevron')}</button></td></tr>`;
          })
          .join('')}</tbody></table></div>`
      : empty(
          'No encontramos ese cliente',
          'Intenta buscar por otro nombre o teléfono.',
        )
  }<div class="table-footer">${data.length} clientes · Datos de demostración</div></section>`;
}
