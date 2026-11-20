# Traducción del CSS global

Fecha 2026-11-20.

## Alcance

Se tradujeron las clases propias de los estilos globales, las propiedades personalizadas de tema y los selectores de navegación móvil, movimiento y portal de cuenta. Los usos en JavaScript, HTML, hojas de pantalla, datos visuales de demo y pruebas de navegador se actualizaron en la misma operación.

| Hoja anterior | Hoja actual | Ejemplos |
| --- | --- | --- |
| `shared/styles.css` | `shared/global.estilos.css` | `admin-layout` → `estructura-admin`, `surface` → `superficie`, `form-drawer` → `formulario-lateral` |
| `shared/theme.css` | `shared/tema.estilos.css` | `--accent` → `--acento`, `--ink` → `--texto`, `--surface-soft` → `--superficie-suave` |
| `shared/mobile.css` | `shared/movil.estilos.css` | `mobile-tabbar` → `navegacion-inferior`, `mobile-tab` → `pestana-movil`, `--tab-count` → `--cantidad-pestanas` |
| `shared/motion.css` | `shared/movimiento.estilos.css` | `motion-enter` → `animar-entrada`, `screen-arrive` → `entrada-pantalla`, `data-motion-direction` → `data-direccion-animacion` |
| `shared/account-portal.css` | `shared/cuenta.portal.css` | `account-portal` → `cuenta-portal`, `data-account-portal-copy` → `data-cuenta-portal-copiar` |

La traducción conserva colores, medidas, orden de reglas, puntos de corte y animaciones. Los nombres impuestos por Bootstrap, HTML y ARIA permanecen compatibles. `data-theme`, `light`, `dark` y `cita-theme` siguen siendo la interfaz del sistema de tema. Las etiquetas y roles accesibles del portal de cuenta conservan sus asociaciones. La navegación inferior conserva su posición, destinos y gestión de foco.

## Comprobaciones

- Pasaron 297 pruebas unitarias, `npm run build` y `git diff --check`.
- La comparación estructural de las 33 hojas CSS comprobó selectores, orden, prioridades, declaraciones y valores. Las diferencias se limitaron a los nombres coordinados. Se revisaron las referencias antiguas en `src/`, `tests/`, `index.html` y los datos visuales de la demo.
- Se verificaron 145 casos de Playwright con API simulada. Un caso de preferencia de Agenda pasó al reintentar después de que la prueba anterior cerrara una petición en vuelo. Se ajustó el manejo de ese cierre en el doble de red. Los ocho casos repetidos en serie pasaron e incluyen los cuatro nuevos de tema, navegación inferior, foco, copia del enlace del portal, diálogos y movimiento reducido a 1366 y 390 px.
- Pasaron los seis recorridos independientes de Edge con API simulada. Se revisaron muestras de escritorio y móvil en claro y oscuro de las pantallas conectadas, la demo y el portal público.
- Con el CSS traducido se ejecutaron los 33 casos de navegador con MariaDB. El resultado de la corrida y la repetición del caso de horario se registran en el [resultado del núcleo compartido](resultado-nucleo-compartido-2026-11-20.md).

Para repetir la suite con API simulada, ejecutar `npm run test:browser -- --config tests/m4-navegador.config.js`.

## Correspondencia de nombres

<details>
<summary>Clases e identificadores</summary>

| Antes | Ahora |
| --- | --- |
| `account-menu-panel` | `menu-cuenta-panel` |
| `account-menu-trigger` | `menu-cuenta-disparador` |
| `account-menu` | `menu-cuenta` |
| `account-portal-actions` | `cuenta-portal-acciones` |
| `account-portal-status` | `cuenta-portal-estado` |
| `account-portal-title` | `cuenta-portal-titulo` |
| `account-portal-unavailable` | `cuenta-portal-no-disponible` |
| `account-portal-url` | `cuenta-portal-enlace` |
| `account-portal` | `cuenta-portal` |
| `action-caution` | `accion-precaucion` |
| `action-danger` | `accion-peligro` |
| `admin-layout` | `estructura-admin` |
| `amber` | `ambar` |
| `app-dialog` | `dialogo-app` |
| `app-footer` | `pie-app` |
| `app-table` | `tabla-app` |
| `app-toast` | `aviso-app` |
| `appointment-identity` | `cita-identidad` |
| `appointment-reason` | `cita-motivo` |
| `auth-screen-transition` | `transicion-ingreso` |
| `availability-label` | `etiqueta-disponibilidad` |
| `avatar-large` | `avatar-grande` |
| `blue` | `azul` |
| `branch-actions` | `sucursal-acciones` |
| `branch-card` | `tarjeta-sucursal` |
| `branch-grid` | `cuadricula-sucursales` |
| `branch-title` | `sucursal-titulo` |
| `brand-dot` | `punto-marca` |
| `brand-logo-on-dark` | `logo-marca-oscuro` |
| `brand-logo-on-light` | `logo-marca-claro` |
| `brand` | `marca` |
| `breadcrumbs` | `migas-navegacion` |
| `btn-danger-soft` | `btn-peligro-suave` |
| `btn-subtle` | `btn-discreto` |
| `card-assignees` | `tarjeta-asignaciones` |
| `card-bottom` | `tarjeta-pie` |
| `card-top` | `tarjeta-cabecera` |
| `checkbox-list` | `lista-casillas` |
| `compact-note` | `nota-compacta` |
| `count-badge` | `distintivo-cantidad` |
| `current` | `actual` |
| `data-account-portal-copy` | `data-cuenta-portal-copiar` |
| `data-account-portal-status` | `data-cuenta-portal-estado` |
| `demo-pill` | `indicador-demo` |
| `detail-list` | `lista-detalle` |
| `dialog-body` | `dialogo-cuerpo` |
| `dialog-footer` | `dialogo-pie` |
| `dialog-header` | `dialogo-cabecera` |
| `discard-confirm` | `confirmacion-descarte` |
| `empty-state` | `estado-vacio` |
| `entity-grid` | `cuadricula-entidades` |
| `entity-toggle` | `selector-entidad` |
| `eyebrow` | `sobretitulo` |
| `field-hint` | `ayuda-campo` |
| `filled` | `con-valor` |
| `filter-group` | `grupo-filtros` |
| `filter-select` | `selector-filtro` |
| `footer-logo` | `logo-pie` |
| `form-drawer` | `formulario-lateral` |
| `form-error` | `error-formulario` |
| `form-field` | `campo-formulario` |
| `form-intro` | `introduccion-formulario` |
| `form-row-two` | `formulario-dos-columnas` |
| `form-separator` | `separador-formulario` |
| `glass-effect--dark` | `efecto-cristal--oscuro` |
| `glass-effect` | `efecto-cristal` |
| `green-dot` | `punto-verde` |
| `green` | `verde` |
| `heading-actions` | `acciones-encabezado` |
| `icon-btn` | `boton-icono` |
| `icon` | `icono` |
| `information-note` | `nota-informativa` |
| `is-current` | `es-actual` |
| `is-leaving` | `esta-saliendo` |
| `lavender` | `lavanda` |
| `legend` | `leyenda` |
| `login-actions` | `ingreso-acciones` |
| `login-footer` | `ingreso-pie` |
| `login-notice` | `ingreso-aviso` |
| `main-content` | `contenido-principal` |
| `main-layout` | `estructura-principal` |
| `menu-open` | `menu-abierto` |
| `mini-dot` | `punto-pequeno` |
| `mint` | `menta` |
| `mobile-menu` | `menu-movil` |
| `mobile-professional-brand` | `marca-catalogo-movil` |
| `mobile-tab-icon` | `pestana-movil-icono` |
| `mobile-tab` | `pestana-movil` |
| `mobile-tabbar-inner` | `navegacion-inferior-contenido` |
| `mobile-tabbar` | `navegacion-inferior` |
| `motion-enter` | `animar-entrada` |
| `nav-count` | `navegacion-contador` |
| `nav-disclosure-arrow` | `navegacion-flecha` |
| `nav-disclosure-trigger` | `navegacion-desplegador` |
| `nav-item` | `navegacion-enlace` |
| `nav-section` | `navegacion-seccion` |
| `nav-subitem` | `navegacion-subenlace` |
| `nav-submenu` | `navegacion-submenu` |
| `notification-button` | `boton-notificaciones` |
| `notification-card` | `tarjeta-notificacion` |
| `optional` | `opcional` |
| `orange` | `naranja` |
| `page-heading` | `encabezado-pagina` |
| `peach` | `durazno` |
| `person-cell` | `celda-persona` |
| `portal-card` | `tarjeta-portal` |
| `portal-icon` | `icono-portal` |
| `professional-card` | `tarjeta-profesional` |
| `professional-select` | `selector-profesional` |
| `profile-button` | `boton-perfil` |
| `purple` | `morado` |
| `report-card` | `tarjeta-reporte` |
| `search-field` | `campo-busqueda` |
| `section-card` | `tarjeta-seccion` |
| `section-form-footer` | `pie-formulario-seccion` |
| `section-heading` | `encabezado-seccion` |
| `section-title-line` | `linea-titulo-seccion` |
| `segmented` | `selector-segmentado` |
| `selected` | `seleccionado` |
| `service-card` | `tarjeta-servicio` |
| `service-icon` | `icono-servicio` |
| `service-tags` | `etiquetas-servicio` |
| `settings-card` | `tarjeta-configuracion` |
| `sidebar-bottom` | `seccion-inferior-lateral` |
| `sidebar-foot` | `pie-lateral` |
| `sidebar-overlay` | `fondo-barra-lateral` |
| `sidebar` | `barra-lateral` |
| `sky` | `celeste` |
| `soft-tag` | `etiqueta-suave` |
| `startup-actions` | `arranque-acciones` |
| `startup-error` | `arranque-error` |
| `stat-caption` | `indicador-texto` |
| `stat-card` | `tarjeta-indicador` |
| `stat-icon` | `indicador-icono` |
| `stat-number` | `indicador-valor` |
| `stat-top` | `indicador-cabecera` |
| `stats-grid` | `cuadricula-indicadores` |
| `status-badge` | `distintivo-estado` |
| `subtle-icon` | `icono-discreto` |
| `subtle-text` | `texto-discreto` |
| `surface` | `superficie` |
| `text-button` | `boton-texto` |
| `theme-toggle` | `selector-tema` |
| `timezone` | `zona-horaria` |
| `toast-region` | `region-avisos` |
| `topbar-date` | `barra-superior-fecha` |
| `topbar-divider` | `barra-superior-separador` |
| `topbar-right` | `barra-superior-derecha` |
| `topbar` | `barra-superior` |
| `wide` | `amplio` |
| `workspace-avatar` | `avatar-espacio` |
| `workspace-identity` | `identidad-espacio` |
| `data-motion-direction` | `data-direccion-animacion` |

</details>

<details>
<summary>Propiedades personalizadas</summary>

| Antes | Ahora |
| --- | --- |
| `--accent-dark` | `--acento-oscuro` |
| `--accent-soft` | `--acento-suave` |
| `--accent` | `--acento` |
| `--action-caution-bg` | `--accion-precaucion-fondo` |
| `--action-caution-border` | `--accion-precaucion-borde` |
| `--action-caution-hover` | `--accion-precaucion-hover` |
| `--action-caution-text` | `--accion-precaucion-texto` |
| `--action-danger-bg` | `--accion-peligro-fondo` |
| `--action-danger-hover` | `--accion-peligro-hover` |
| `--action-danger-text` | `--accion-peligro-texto` |
| `--action-danger-tint` | `--accion-peligro-matiz` |
| `--blue` | `--azul` |
| `--border-strong` | `--borde-fuerte` |
| `--border` | `--borde` |
| `--canvas` | `--fondo` |
| `--dialog-glass` | `--cristal-dialogo` |
| `--glass-border` | `--cristal-borde` |
| `--glass-shadow` | `--cristal-sombra` |
| `--glass-surface` | `--cristal-superficie` |
| `--green` | `--verde` |
| `--ink` | `--texto` |
| `--motion-glide` | `--movimiento-deslizamiento` |
| `--motion-press` | `--movimiento-pulsacion` |
| `--motion-reveal` | `--movimiento-entrada` |
| `--motion-snap` | `--movimiento-rapido` |
| `--motion-spring` | `--movimiento-rebote` |
| `--muted` | `--texto-secundario` |
| `--radius` | `--radio` |
| `--schedule-accent` | `--acento-horario` |
| `--sidebar-muted` | `--barra-lateral-texto` |
| `--sidebar` | `--barra-lateral` |
| `--surface-shadow` | `--superficie-sombra` |
| `--surface-soft` | `--superficie-suave` |
| `--surface` | `--superficie` |
| `--tab-count` | `--cantidad-pestanas` |

</details>

<details>
<summary>Animaciones</summary>

| Antes | Ahora |
| --- | --- |
| `auth-screen-arrive` | `entrada-ingreso` |
| `backdrop-arrive` | `entrada-fondo` |
| `dialog-pop` | `entrada-dialogo` |
| `icon-flip` | `giro-icono` |
| `mobile-tab-pop` | `resalte-pestana-movil` |
| `screen-arrive` | `entrada-pantalla` |
| `selection-pop` | `resalte-seleccion` |
| `step-back` | `retroceso-paso` |
| `step-forward` | `avance-paso` |
| `tile-arrive` | `entrada-tarjeta` |
| `toast-in` | `entrada-aviso` |
| `toast-out` | `salida-aviso` |
| `toast-pop` | `aparicion-aviso` |

</details>
