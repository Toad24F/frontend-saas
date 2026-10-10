import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../../shared/app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../../shared/ui.js';
import './style.css';
import { stats } from '../../../shared/screens/agenda/view.js';
import { appointmentTable } from '../../../shared/screens/agenda/table.js';
export function overview() {
  const today = list('appointments', state.tenantId).filter(
      (a) => a.date === TODAY,
    ),
    week = list('appointments', state.tenantId);
  return `${pageHead('Buenos días, Adriana', 'Un nuevo día para hacer sentir bien a tus pacientes.', button('Nueva cita', 'new-appointment'))}${stats()}<div class="overview-grid"><section class="surface"><div class="section-heading"><div><h2>Tu semana en perspectiva</h2><p>Citas por día · septiembre de 2026</p></div><span class="soft-tag">Esta semana</span></div><div class="bar-chart">${Array.from(
    { length: 7 },
    (_, i) => {
      const day = addDays(TODAY, i - 1),
        count = week.filter((a) => a.date === day).length;
      return `<div class="bar-column"><strong>${count}</strong><div class="bar-track"><div class="bar-fill ${day === TODAY ? 'highlight' : ''}" style="height:${Math.max(count * 14, 3)}%"></div></div><span>${formatDate(day, { weekday: 'short' })}</span></div>`;
    },
  ).join(
    '',
  )}</div></section><section class="daily-insight"><span class="insight-icon">${icon('heart')}</span><span class="eyebrow">CADA ENCUENTRO CUENTA</span><h2>El cuidado empieza<br>con una buena agenda.</h2><p>Tienes ${today.filter((a) => a.status === 'confirmada').length} citas confirmadas para hoy. Prepara tu jornada y dedica tiempo a lo que más importa.</p><a href="/admin/agenda" class="btn btn-light" data-nav="agenda">Ver mi agenda ${icon('arrow')}</a></section></div><section class="surface overview-today"><div class="section-heading"><div><h2>Citas de hoy</h2><p>${formatDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><span class="soft-tag">${today.length} citas</span></div>${appointmentTable(today)}</section>`;
}
