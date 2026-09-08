import { state, stats } from './app.js';
import {
  db,
  list,
  resource,
  appointmentInfo,
  tenantById,
  TODAY,
  addDays,
  formatDate,
  money,
} from './data.js';
import { icon } from './icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from './ui.js';
export function renderView(page) {
  const views = {
    resumen: overview,
    clientes: clients,
    profesionales: professionals,
    servicios: services,
    sucursales: branches,
    disponibilidad: availability,
    reportes: reports,
    notificaciones: notifications,
    configuracion: settings,
    plataforma: platform,
  };
  return views[page]
    ? views[page]()
    : empty(
        'Esta página no existe',
        'Vuelve a tu agenda para continuar.',
        button('Ir a la agenda', 'go-agenda', 'calendar'),
      );
}
export const reportState = {
  from: '2026-09-01',
  to: '2026-09-30',
  branch: 'all',
};
export function appointmentTable(appointments) {
  if (!appointments.length)
    return empty(
      'Sin citas para mostrar',
      'Prueba otra fecha o agrega una nueva cita.',
    );
  return `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Paciente</th><th>Servicio y profesional</th><th>Fecha y hora</th><th>Sucursal</th><th>Estado</th><th><span class="visually-hidden">Acciones</span></th></tr></thead><tbody>${appointments
    .map((a) => {
      const e = appointmentInfo(a);
      return `<tr><td><div class="person-cell">${avatar(
        e.client.name
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join(''),
        'mint',
      )}<span><strong>${esc(e.client.name)}</strong><small>${a.folio}</small></span></div></td><td><strong>${esc(e.service.name)}</strong><small>${esc(e.professional.name)}</small></td><td><strong>${formatDate(a.date, { day: 'numeric', month: 'short' })}</strong><small>${a.start} – ${a.end}</small></td><td>${esc(e.branch.name)}</td><td>${badge(a.status)}</td><td><button class="icon-btn" data-appointment="${a.id}" aria-label="Ver cita de ${esc(e.client.name)}">${icon('chevron')}</button></td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
function overview() {
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
  )}</div></section><section class="daily-insight"><span class="insight-icon">${icon('heart')}</span><span class="eyebrow">CADA ENCUENTRO CUENTA</span><h2>El cuidado empieza<br>con una buena agenda.</h2><p>Tienes ${today.filter((a) => a.status === 'confirmada').length} citas confirmadas para hoy. Prepara tu jornada y dedica tiempo a lo que más importa.</p><a href="/admin/agenda" class="btn btn-light" data-nav="agenda">Ver mi agenda ${icon('arrow')}</a></section></div><section class="surface"><div class="section-heading"><div><h2>Citas de hoy</h2><p>${formatDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><span class="soft-tag">${today.length} citas</span></div>${appointmentTable(today)}</section>`;
}
function clients() {
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
function professionals() {
  return `${pageHead('Profesionales', 'El equipo que hace posible una mejor atención.', button('Nuevo profesional', 'new-professional'))}<div class="entity-grid">${list(
    'professionals',
    state.tenantId,
  )
    .map(
      (p) =>
        `<article class="surface professional-card"><div class="card-top">${avatar(p.initials, p.color, 'avatar-large')}<span class="availability-label"><i></i>Activo</span></div><h2>${esc(p.name)}</h2><p>${esc(p.specialty)}</p><div class="professional-meta"><span>${icon('briefcase')}${p.serviceIds.length} servicios asignados</span><span>${icon('pin')}${p.branchIds.length} ${p.branchIds.length === 1 ? 'sucursal' : 'sucursales'}</span></div><div class="service-tags">${p.serviceIds.map((id) => `<span>${esc(resource('services', id, state.tenantId).name)}</span>`).join('')}</div><div class="card-bottom"><a href="/admin/disponibilidad" data-nav="disponibilidad" class="text-button">Ver disponibilidad ${icon('arrow')}</a><button class="icon-btn" data-edit-professional="${p.id}" aria-label="Editar a ${esc(p.name)}">${icon('edit')}</button></div></article>`,
    )
    .join('')}</div>`;
}
function services() {
  return `${pageHead('Servicios', 'Una oferta clara, con el tiempo que cada consulta merece.', button('Nuevo servicio', 'new-service'))}<div class="entity-grid">${list(
    'services',
    state.tenantId,
  )
    .map(
      (s) =>
        `<article class="surface service-card"><div class="card-top"><span class="service-icon ${s.color}">${icon(s.icon)}</span><button class="icon-btn" data-edit-service="${s.id}" aria-label="Editar ${esc(s.name)}">${icon('edit')}</button></div><h2>${esc(s.name)}</h2><p>${esc(s.description)}</p><div class="service-facts"><span>${icon('clock')}${s.duration} minutos</span><strong>${money(s.price)} <small>MXN</small></strong></div><div class="card-bottom"><span class="avatar-stack">${list(
          'professionals',
          state.tenantId,
        )
          .filter((p) => p.serviceIds.includes(s.id))
          .map((p) => avatar(p.initials, p.color))
          .join(
            '',
          )}</span><span class="subtle-text">${list('professionals', state.tenantId).filter((p) => p.serviceIds.includes(s.id)).length} profesionales</span></div></article>`,
    )
    .join(
      '',
    )}</div><div class="information-note">${icon('info')} La duración de cada servicio determina los horarios disponibles en tu portal. El precio es informativo; no se realizan cobros en línea.</div>`;
}
function branches() {
  return `${pageHead('Sucursales', 'Cada ubicación, conectada con tu agenda.', button('Nueva sucursal', 'new-branch'))}<div class="entity-grid branch-grid">${list(
    'branches',
    state.tenantId,
  )
    .map(
      (b) =>
        `<article class="surface branch-card"><div class="branch-visual ${b.color}"><div class="map-street street-one"></div><div class="map-street street-two"></div><div class="map-street street-three"></div><div class="map-street street-four"></div><span class="map-pin">${icon('pin')}</span><span class="map-label">CHIHUAHUA · ILUSTRACIÓN</span></div><div class="branch-content"><div class="card-top"><h2>${esc(b.name)}</h2><span class="availability-label"><i></i>Activa</span></div><div class="branch-line">${icon('pin')}<span>${esc(b.address)}</span></div><div class="branch-line">${icon('message')}<span>${esc(b.phone)}</span></div><div class="branch-notes"><strong>Antes de tu visita</strong><p>${esc(b.notes)}</p></div><div class="card-bottom"><span class="subtle-text">${list('professionals', state.tenantId).filter((p) => p.branchIds.includes(b.id)).length} profesionales asignados</span><button class="text-button" data-edit-branch="${b.id}">Editar ${icon('edit')}</button></div></div></article>`,
    )
    .join('')}</div>`;
}
function availability() {
  const tenant = tenantById(state.tenantId),
    p = list('professionals', state.tenantId);
  const selected =
    p.find((p) => p.id === Number(state.scheduleProfessional)) || p[0];
  if (!selected)
    return empty(
      'Agrega a tu primer profesional',
      'Después podrás configurar sus horarios.',
    );
  const schedules = list('schedules', state.tenantId).filter(
    (s) => s.professionalId === selected.id,
  );
  return `${pageHead('Disponibilidad', 'Un horario bien pensado deja espacio para todo.', button('Agregar bloqueo', 'new-block', 'plus', 'btn-light'))}<section class="surface mode-section"><div><h2>Cómo se llena tu agenda</h2><p>Elige qué horarios podrán reservar tus pacientes.</p></div><div class="mode-options"><button data-mode="free" class="mode-card ${tenant.mode === 'free' ? 'selected' : ''}">${icon('grid')}<span><strong>Ventana libre</strong><small>Muestra todos los espacios disponibles.</small></span><i>${tenant.mode === 'free' ? icon('check') : ''}</i></button><button data-mode="compact" class="mode-card ${tenant.mode === 'compact' ? 'selected' : ''}">${icon('calendar')}<span><strong>Agenda compacta</strong><small>Prioriza citas consecutivas, día por día.</small></span><i>${tenant.mode === 'compact' ? icon('check') : ''}</i></button></div></section><section class="surface"><div class="section-heading"><div><h2>Horario semanal</h2><p>Sucursal y bloques de atención por profesional.</p></div><select class="form-select professional-select" id="schedule-professional" aria-label="Profesional del horario">${p.map((person) => `<option value="${person.id}" ${person.id === selected.id ? 'selected' : ''}>${esc(person.name)}</option>`).join('')}</select></div><form id="schedule-form"><div class="table-responsive"><table class="table app-table schedule-table align-middle"><thead><tr><th>Día</th><th>Sucursal</th><th>Entrada</th><th>Descanso</th><th>Salida</th></tr></thead><tbody>${schedules
    .map(
      (s) =>
        `<tr class="${!s.enabled ? 'schedule-disabled' : ''}"><td><label class="form-check form-switch"><input class="form-check-input" type="checkbox" name="enabled-${s.id}" ${s.enabled ? 'checked' : ''} aria-label="Activar ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][s.day]}"/><span>${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][s.day]}</span></label></td><td><select class="form-select form-select-sm" name="branch-${s.id}" aria-label="Sucursal del día ${s.day}">${list(
          'branches',
          state.tenantId,
        )
          .filter((b) => selected.branchIds.includes(b.id))
          .map(
            (b) =>
              `<option value="${b.id}" ${s.branchId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`,
          )
          .join(
            '',
          )}</select></td><td><input class="form-control form-control-sm" type="time" name="start-${s.id}" value="${s.start}" aria-label="Entrada del día ${s.day}" required/></td><td><div class="time-pair"><input class="form-control form-control-sm" type="time" name="breakStart-${s.id}" value="${s.breakStart}" aria-label="Inicio de descanso del día ${s.day}" required/><span>–</span><input class="form-control form-control-sm" type="time" name="breakEnd-${s.id}" value="${s.breakEnd}" aria-label="Fin de descanso del día ${s.day}" required/></div></td><td><input class="form-control form-control-sm" type="time" name="end-${s.id}" value="${s.end}" aria-label="Salida del día ${s.day}" required/></td></tr>`,
    )
    .join(
      '',
    )}</tbody></table></div><div class="section-form-footer"><span>${icon('coffee')} El descanso se bloquea automáticamente.</span><button class="btn btn-primary" type="submit">${icon('check')}Guardar horario</button></div></form></section><section class="surface mt-4"><div class="section-heading"><div><h2>Bloqueos excepcionales</h2><p>Vacaciones, festivos o cambios de último momento.</p></div></div>${
    list('blocks', state.tenantId).length
      ? `<div class="blocks-list">${list('blocks', state.tenantId)
          .map(
            (b) =>
              `<div class="block-item"><span class="stat-icon amber">${icon('lock')}</span><div><strong>${esc(b.reason)}</strong><small>${formatDate(b.date, { day: 'numeric', month: 'short' })}${b.endDate !== b.date ? ` – ${formatDate(b.endDate, { day: 'numeric', month: 'short' })}` : ''} · ${b.start ? b.start + ' – ' + b.end : 'Todo el día'} · ${b.professionalId ? esc(resource('professionals', b.professionalId, state.tenantId).name) : 'Todo el equipo'}</small></div><button class="icon-btn" data-remove-block="${b.id}" aria-label="Eliminar bloqueo ${esc(b.reason)}">${icon('x')}</button></div>`,
          )
          .join('')}</div>`
      : empty(
          'Sin bloqueos programados',
          'Tu equipo mantiene su horario habitual.',
        )
  }</section>`;
}
export function reportData() {
  return list('appointments', state.tenantId).filter(
    (a) =>
      a.date >= reportState.from &&
      a.date <= reportState.to &&
      (reportState.branch === 'all' ||
        a.branchId === Number(reportState.branch)),
  );
}
function reports() {
  const apps = reportData(),
    completed = apps.filter((a) => a.status === 'completada'),
    cancelled = apps.filter((a) => a.status === 'cancelada'),
    noShows = apps.filter((a) => a.status === 'no_asistio'),
    income = completed.reduce(
      (sum, a) => sum + resource('services', a.serviceId, state.tenantId).price,
      0,
    );
  const table = (kind) =>
    `<table class="table app-table"><thead><tr><th>${kind === 'services' ? 'Servicio' : 'Sucursal'}</th><th>Atendidas</th><th>Ingreso estimado</th></tr></thead><tbody>${list(
      kind,
      state.tenantId,
    )
      .map((item) => {
        const grouped = completed.filter(
          (a) => a[kind === 'services' ? 'serviceId' : 'branchId'] === item.id,
        );
        return `<tr><td>${esc(item.name)}</td><td>${grouped.length}</td><td><strong>${money(grouped.reduce((sum, a) => sum + resource('services', a.serviceId, state.tenantId).price, 0))}</strong></td></tr>`;
      })
      .join('')}</tbody></table>`;
  return `${pageHead('Reportes', 'Convierte tu actividad en decisiones más claras.', button('Guardar como PDF', 'export-report', 'download'))}<section class="surface report-filters"><label>Desde<input type="date" class="form-control" id="report-from" value="${reportState.from}"/></label><label>Hasta<input type="date" class="form-control" id="report-to" value="${reportState.to}"/></label><label>Sucursal<select id="report-branch" class="form-select"><option value="all">Todas las sucursales</option>${list(
    'branches',
    state.tenantId,
  )
    .map(
      (b) =>
        `<option value="${b.id}" ${reportState.branch === String(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`,
    )
    .join(
      '',
    )}</select></label><button class="btn btn-light" data-action="filter-reports">Aplicar filtros ${icon('arrow')}</button></section><div id="printable-report"><div class="print-heading"><h1>${esc(tenantById(state.tenantId).name)} · Reporte de citas</h1><p>${formatDate(reportState.from)} al ${formatDate(reportState.to)} · Datos de demostración</p></div><div class="stats-grid">${[
    [completed.length, 'Citas atendidas', 'circleCheck', 'green'],
    [cancelled.length, 'Canceladas', 'x', 'orange'],
    [noShows.length, 'No asistieron', 'user', 'purple'],
    [money(income), 'Ingresos estimados', 'money', 'blue'],
  ]
    .map(
      ([n, l, i, c]) =>
        `<div class="stat-card"><div class="stat-top"><span>${l}</span><span class="stat-icon ${c}">${icon(i)}</span></div><div class="stat-number">${n}</div><div class="stat-caption">${l === 'Ingresos estimados' ? 'MXN · Solo citas completadas' : 'En el periodo seleccionado'}</div></div>`,
    )
    .join(
      '',
    )}</div><div class="report-tables"><section class="surface"><div class="section-heading"><h2>Ingresos por servicio</h2></div><div class="table-responsive">${table('services')}</div></section><section class="surface"><div class="section-heading"><h2>Ingresos por sucursal</h2></div><div class="table-responsive">${table('branches')}</div></section></div><div class="information-note">${icon('info')} Importes estimados a partir del precio del catálogo y las citas completadas. Este reporte no representa cobros ni un comprobante fiscal.</div></div>`;
}
function notifications() {
  const tenant = tenantById(state.tenantId),
    apps = list('appointments', state.tenantId)
      .filter((a) => a.status === 'confirmada')
      .slice(0, 8);
  return `${pageHead('Notificaciones', 'Acompaña a tus pacientes antes de cada consulta.')}<div class="whatsapp-banner"><span class="whatsapp-symbol">${icon('message')}</span><div><h2>Un recordatorio puede hacer la diferencia</h2><p>Confirmaciones y recordatorios por WhatsApp, desde un solo lugar.</p></div><span class="soft-tag">Vista de demostración</span></div><div class="notification-grid"><section class="surface"><div class="section-heading"><h2>Automatizaciones</h2></div><form id="notification-form"><div class="automation-row"><span class="stat-icon green">${icon('circleCheck')}</span><div><strong>Confirmación de reserva</strong><p>Al completar el agendamiento.</p></div><label class="form-switch"><input class="form-check-input" type="checkbox" name="confirm" ${tenant.confirmations === false ? '' : 'checked'} aria-label="Activar confirmación de reserva"/></label></div><div class="automation-row"><span class="stat-icon blue">${icon('clock')}</span><div><strong>Recordatorio previo</strong><p>Un mensaje antes de la cita.</p></div><label class="form-switch"><input class="form-check-input" type="checkbox" name="remind" ${tenant.reminders === false ? '' : 'checked'} aria-label="Activar recordatorio"/></label></div><div class="reminder-setting"><label class="form-label" for="reminder-hours">Enviar recordatorio</label><select id="reminder-hours" name="hours" class="form-select">${[2, 12, 24, 48].map((h) => `<option value="${h}" ${tenant.reminder === h ? 'selected' : ''}>${h} horas antes</option>`).join('')}</select></div><div class="section-form-footer"><span>Configuración simulada</span><button class="btn btn-primary" type="submit">Guardar</button></div></form></section><section class="message-preview"><div class="message-preview-header">${avatar(tenant.initials, 'mint')}<span><strong>${esc(tenant.name)}</strong><small>Vista previa del mensaje</small></span></div><div class="message-bubble"><p>¡Hola, María! 👋</p><p>Tu cita en <strong>${esc(tenant.name)}</strong> está confirmada.</p><p>📅 9 de septiembre, 09:30 h<br/>🩺 ${esc(list('services', state.tenantId)[0]?.name || 'Servicio por configurar')}<br/>📍 ${esc(list('branches', state.tenantId)[0]?.name || 'Sucursal por configurar')}</p><p>Te esperamos 10 minutos antes.<br/>¡Gracias por confiar en nosotros!</p><small>10:42 ${icon('check')}${icon('check')}</small></div><p class="preview-caption">Ejemplo ilustrativo · No se envían mensajes</p></section></div><section class="surface mt-4"><div class="section-heading"><div><h2>Mensajes de la agenda</h2><p>Vista previa de las notificaciones que se generarían.</p></div><span class="soft-tag">Simulación</span></div><div class="table-responsive"><table class="table app-table"><thead><tr><th>Destinatario</th><th>Tipo</th><th>Cita</th><th>Estado</th></tr></thead><tbody>${apps.map((a) => `<tr><td><strong>${esc(appointmentInfo(a).client.name)}</strong><small>${esc(appointmentInfo(a).client.phone)}</small></td><td>${icon('message', 'subtle-icon')} Confirmación</td><td>${a.folio}</td><td><span class="soft-tag">Sin envío real</span></td></tr>`).join('')}</tbody></table></div></section>`;
}
function settings() {
  const t = tenantById(state.tenantId);
  return `${pageHead('Configuración', 'Los detalles que hacen de este espacio tu negocio.')}<div class="settings-grid"><section class="surface"><div class="section-heading"><h2>Información del negocio</h2></div><form id="business-form" class="settings-form"><div class="business-identity">${avatar(t.initials, 'mint', 'avatar-large')}<div><strong>${esc(t.name)}</strong><p>${esc(t.category)}</p></div></div><div class="form-field"><label class="form-label" for="business-name">Nombre del negocio</label><input id="business-name" name="name" class="form-control" value="${esc(t.name)}" required maxlength="150"/></div><div class="form-row-two"><div class="form-field"><label class="form-label" for="business-email">Correo de contacto</label><input id="business-email" name="email" class="form-control" type="email" value="${esc(t.email)}" required/></div><div class="form-field"><label class="form-label" for="business-phone">Teléfono</label><input id="business-phone" name="phone" class="form-control" value="${esc(t.phone)}" pattern="[0-9]{10}" required inputmode="numeric"/></div></div><div class="form-field"><label class="form-label" for="business-timezone">Zona horaria</label><input id="business-timezone" class="form-control" value="America/Chihuahua · GMT-6" readonly/></div><button class="btn btn-primary" type="submit">Guardar cambios</button></form></section><div><section class="surface public-link-card"><span class="service-icon orange">${icon('link')}</span><h2>Tu portal de reservas</h2><p>Un enlace único para que tus clientes encuentren tus servicios y horarios.</p><div class="public-url">/reservas/${t.slug}</div><button class="btn btn-light w-100" data-action="copy-link">${icon('link')}Copiar enlace</button><a class="btn btn-primary w-100 mt-2" href="/reservas/${t.slug}" data-portal>Visitar portal ${icon('external')}</a></section><section class="surface demo-settings"><h2>Explorar el prototipo</h2><p>Cambia entre dos negocios ficticios o revisa la pantalla de administración de la plataforma.</p><button class="text-button" data-action="switch-tenant">Cambiar negocio ${icon('arrow')}</button><a class="text-button mt-3" href="/admin/plataforma" data-nav="plataforma">Administración de plataforma ${icon('arrow')}</a></section></div></div><div class="information-note">${icon('shield')} Los cambios duran durante esta sesión. El prototipo no incluye autenticación ni garantiza aislamiento de datos; esa validación corresponde al backend.</div>`;
}
function platform() {
  return `${pageHead('Negocios de la plataforma', 'Vista de superadministración · Entorno de demostración.', button('Registrar negocio', 'new-tenant'))}<div class="stats-grid">${[
    [db.tenants.length, 'Negocios registrados'],
    [db.tenants.filter((t) => !t.suspended).length, 'Negocios activos'],
    [db.tenants.filter((t) => t.suspended).length, 'Suspendidos'],
    [db.professionals.length, 'Profesionales totales'],
  ]
    .map(
      ([n, l]) =>
        `<div class="stat-card"><div class="stat-top">${l}</div><div class="stat-number">${n}</div><span class="stat-caption">Plataforma · Datos ficticios</span></div>`,
    )
    .join(
      '',
    )}</div><section class="surface"><div class="section-heading"><h2>Espacios de trabajo</h2><span class="soft-tag">Rol simulado: superadministrador</span></div><div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Negocio</th><th>Enlace público</th><th>Licencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${db.tenants.map((t) => `<tr><td><div class="person-cell">${avatar(t.initials, 'mint')}<span><strong>${esc(t.name)}</strong><small>${esc(t.email)}</small></span></div></td><td>/reservas/${esc(t.slug)}</td><td><span class="soft-tag">Demo · ${t.license || '30 días'}</span></td><td>${t.suspended ? '<span class="status-badge cancelada">Suspendido</span>' : '<span class="status-badge completada">Activo</span>'}</td><td><button class="text-button" data-toggle-tenant="${t.id}">${t.suspended ? 'Reactivar' : 'Suspender'}</button><button class="text-button ms-3" data-license-tenant="${t.id}">Renovar licencia</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
