# Reglas y plan de traducción de la nomenclatura del frontend

Fecha de definición: 2026-11-16  
Estado: plan cerrado el 2026-11-20. Implementados y verificados los conjuntos 0 a 17.

## Objetivo

Unificar la nomenclatura del frontend con el criterio general del backend: los conceptos del dominio y el código propio se escriben en español. El frontend usa JavaScript vanilla y no tiene un framework que obligue a conservar sufijos como `view`, `actions` o `errors`; por ello, esos sufijos también se traducen.

La traducción no debe alterar contratos HTTP, rutas públicas, almacenamiento persistente ni nombres impuestos por JavaScript, el navegador, Bootstrap, Vite u otras dependencias.

## Convención acordada

Los archivos de una pantalla usarán el formato `dominio.responsabilidad.extensión`.

```text
clientes/
  clientes.vista.js
  clientes.acciones.js
  clientes.errores.js
  clientes.estilos.css
```

Cuando una responsabilidad necesite más precisión, se añade después del dominio:

```text
agenda/
  agenda.editor-estado.js
  agenda.cambio-horario.js
  agenda.presentacion.js
```

### Sufijos que se traducen

| Nombre actual   | Nombre acordado |
| --------------- | --------------- |
| `view`          | `vista`         |
| `actions`       | `acciones`      |
| `errors`        | `errores`       |
| `state`         | `estado`        |
| `presentation`  | `presentacion`  |
| `navigation`    | `navegacion`    |
| `filters`       | `filtros`       |
| `configuration` | `configuracion` |
| `selection`     | `seleccion`     |
| `booking`       | `reserva`       |
| `calendar`      | `calendario`    |
| `schedule`      | `horario`       |
| `entry`         | `entrada`       |
| `directory`     | `directorio`    |
| `panels`        | `paneles`       |
| `utility`       | `utilidades`    |
| `style`         | `estilos`       |
| `operations`    | `operaciones`   |
| `detail`        | `detalle`       |
| `capacity`      | `capacidad`     |
| `accessibility` | `accesibilidad` |
| `contact`       | `contacto`      |
| `dates`         | `fechas`        |

### Términos técnicos que permanecen en inglés

Estos términos conservan su forma en inglés porque representan una responsabilidad o una acción técnica precisa:

- `client`
- `store`
- `payload`
- `render`
- `handler`
- `handle`

Se pueden combinar con nombres del dominio en español:

```js
const agendaClient = crearAgendaClient(api);
const agendaStore = crearAgendaStore(consultarAgenda);
const payload = crearPayloadCita(valores);

function renderAgenda(citas) {}
function handleClicAgenda(evento) {}
```

Archivos válidos bajo esta excepción:

```text
agenda.client.js
agenda.store.js
agenda.payload.js
```

`client` no debe traducirse como `cliente` cuando representa acceso a la API, porque `cliente` ya es una entidad del negocio.

## Qué se debe traducir

- Nombres de carpetas creadas por el proyecto que todavía estén en inglés.
- Nombres de archivos y sus sufijos propios.
- Funciones, métodos y clases propios.
- Variables, parámetros y constantes propios.
- Propiedades de objetos que sean exclusivamente internas del frontend.
- Clases CSS, propiedades CSS personalizadas y animaciones propias.
- Valores internos de `data-*` y nombres de eventos personalizados.
- Nombres de pruebas, variables de fixtures y descripciones de casos escritas en inglés.
- Comentarios, JSDoc y documentación relacionada.
- Estructuras internas de la demo que no representen literalmente un contrato del backend.

La traducción debe hacerse por significado. No se debe sustituir una palabra de forma automática si cambia el sentido de la función.

## Qué no se debe traducir

- Campos de solicitudes o respuestas definidos por el backend.
- Rutas y parámetros de la API.
- Roles, permisos, estados, códigos y enumeraciones definidos por el backend.
- Encabezados y métodos HTTP.
- Palabras reservadas, propiedades estándar y API de JavaScript o del navegador.
- Elementos y atributos estándar de HTML, CSS y ARIA.
- Clases de Bootstrap y nombres pertenecientes a dependencias.
- Scripts de `package.json` y nombres de herramientas como Vite o Playwright.
- Variables `VITE_*` y demás variables de entorno existentes.
- Claves persistentes de `localStorage` o `sessionStorage` sin una migración compatible.
- Rutas de la SPA, segmentos públicos, parámetros de consulta o anclas sin conservar compatibilidad.
- Códigos usados por registros, auditoría o monitoreo.
- Fixtures que reproduzcan literalmente una respuesta del backend.

Cuando un objeto mezcle propiedades internas y contractuales, se conserva el contrato y se traducen solamente las variables que lo rodean:

```js
const datosCita = {
  sucursalId: sucursalSeleccionada,
  personalId: profesionalSeleccionado,
};
```

## Procedimiento obligatorio para cada conjunto

Cada casilla de este documento representa una unidad de trabajo. Un conjunto se considera terminado solo después de completar estos pasos:

- [ ] Confirmar qué nombres pertenecen al frontend y cuáles forman parte de un contrato externo.
- [ ] Definir en el glosario el nombre anterior y el nuevo nombre.
- [ ] Renombrar los archivos del conjunto en una misma operación coordinada.
- [ ] Actualizar todos sus `import` y `export`.
- [ ] Traducir funciones, variables, parámetros, constantes y propiedades exclusivamente internas.
- [ ] Actualizar selectores CSS, `data-*` y eventos internos usados por el conjunto.
- [ ] Actualizar las pruebas unitarias y de navegador relacionadas.
- [ ] Buscar referencias residuales del nombre anterior con `rg`.
- [ ] Ejecutar las pruebas específicas del conjunto.
- [ ] Ejecutar `git diff --check`.
- [ ] Registrar en `docs/` qué se cambió, qué se verificó y qué nombres se conservaron por contrato.

No se deben mezclar refactorizaciones funcionales o visuales con una unidad de traducción.

## Lista de trabajo por conjuntos

### 0. Glosario e inventario

- [x] Crear el glosario definitivo de entidades: cita, cliente, sucursal, profesional, servicio, horario, disponibilidad, reserva, licencia y negocio.
- [x] Crear el glosario de acciones: crear, consultar, cargar, actualizar, eliminar, seleccionar, abrir, cerrar y validar.
- [x] Registrar las excepciones técnicas en inglés: `client`, `store`, `payload`, `render`, `handler` y `handle`.
- [x] Inventariar contratos HTTP, rutas, roles, estados, claves persistentes y selectores externos que quedan protegidos.
- [x] Definir si las siglas técnicas se conservan en mayúsculas: API, HTTP, URL, ID, UTC y DOM.

Resultado: etapa cerrada el 2026-11-17 en `docs/traduccion-nomenclaturas/glosario-nomenclatura-frontend.md`. No se renombró código durante esta etapa.

### 1. Sucursales — conjunto piloto

Este conjunto debe ser el primero porque es suficientemente pequeño para validar la convención completa.

- [x] Renombrar juntos `shared/screens/sucursales/view.js`, `errors.js`, `timezones.js` y `style.css`.
- [x] Renombrar juntos `connected/screens/sucursales/view.js` y `actions.js`.
- [x] Revisar `connected/modules/sucursales/operations.js` y `quota.js`.
- [x] Traducir funciones, variables, constantes, selectores y propiedades internas del conjunto.
- [x] Actualizar las pruebas `sucursales-*.test.js` y sus imports.
- [x] Comprobar modo conectado, escritorio, móvil, tema claro y tema oscuro.
- [x] Confirmar la convención final antes de continuar con otros módulos.

Resultado: piloto cerrado el 2026-11-17 en `docs/traduccion-nomenclaturas/resultado-sucursales-piloto-2026-11-17.md`.

### 2. Servicios

- [x] Renombrar juntos `shared/screens/servicios/view.js`, `errors.js` y `style.css`.
- [x] Renombrar juntos `connected/screens/servicios/view.js` y `actions.js`.
- [x] Revisar `connected/modules/servicios/operations.js`.
- [x] Actualizar `servicios-conectados.test.js`, `servicios-errores.test.js` y pruebas de navegador relacionadas.
- [x] Verificar lista, tarjetas, formularios, estados vacío/error y permisos.

Resultado: conjunto cerrado el 2026-11-17 en `docs/traduccion-nomenclaturas/resultado-servicios-2026-11-17.md`.

### 3. Profesionales

- [x] Renombrar juntos `shared/screens/profesionales/view.js`, `errors.js` y `style.css`.
- [x] Renombrar juntos `connected/screens/profesionales/view.js`, `actions.js` y `style.css`.
- [x] Revisar `connected/modules/profesionales/operations.js`.
- [x] Actualizar las pruebas `profesionales-*.test.js` y pruebas de navegador relacionadas.
- [x] Verificar asignaciones, estados y permisos en ambos tamaños y temas.

Resultado: conjunto cerrado el 2026-11-17 en `docs/traduccion-nomenclaturas/resultado-profesionales-2026-11-17.md`.

### 4. Recepcionistas

- [x] Renombrar juntos `connected/screens/recepcionistas/view.js`, `actions.js`, `errors.js` y `style.css`.
- [x] Actualizar `recepcionistas-errores.test.js` y pruebas de navegador relacionadas.
- [x] Verificar formularios, errores, cupos, estados y permisos.

Resultado: conjunto cerrado el 2026-11-17 en `docs/traduccion-nomenclaturas/resultado-recepcionistas-2026-11-17.md`.

### 5. Clientes

- [x] Renombrar juntos `shared/screens/clientes/style.css`, `connected/screens/clientes/view.js` y `panels.js`.
- [x] Conservar `connected/modules/clientes/client.js` con el término técnico `client`, adaptando el nombre compuesto acordado.
- [x] Renombrar juntos `demo/screens/clientes/view.js`, `actions.js` y `style.css`.
- [x] Revisar `demo/customer-schedule.js` y traducirlo de acuerdo con el glosario.
- [x] Actualizar `m4-clientes-horario.test.js`, sus pruebas de navegador y fixtures relacionados.
- [x] Verificar que las propiedades provenientes del backend permanezcan intactas.

Resultado: conjunto cerrado el 2026-11-17 en [Resultado de traducción de Clientes](resultado-clientes-2026-11-17.md).

### 6. Catálogos compartidos

- [x] Renombrar juntos `shared/screens/catalog-view.js`, `catalog-header.js`, `catalog-pagination.js` y `catalogos/actions.js`.
- [x] Renombrar `shared/screens/local-pagination.js` junto con todas sus pruebas y consumidores.
- [x] Revisar juntos `connected/modules/catalogos/detail.js`, `capacity.js` y `payload.js`; conservar `payload`.
- [x] Actualizar `detalle-edicion-conectado.test.js`, `local-pagination.test.js` y pruebas de navegador relacionadas.
- [x] Verificar que sucursales, servicios y profesionales sigan compartiendo el mismo comportamiento.

Resultado: conjunto cerrado el 2026-11-17 en [Catálogos compartidos](resultado-catalogos-compartidos-2026-11-17.md).

### 7. Disponibilidad — REALIZAR CON CUIDADO

Este conjunto atraviesa código compartido, conectado, demo, estilos y numerosos contratos. Puede trabajarse por subgrupos, pero cada subgrupo debe quedar funcional antes de continuar.

- [x] Traducir como un primer subgrupo `shared/screens/disponibilidad/view.js`, `actions.js`, `errors.js` y `style.css`.
- [x] Traducir como un segundo subgrupo `schedule-rows.js`, `groups.js`, `offering.js` y `branch-assignments.js`.
- [x] Traducir juntos `block-directory.js` y `block-filters.js` con sus selectores y pruebas.
- [x] Traducir juntos `operational.js`, `operational-contract.js` y `operational.css`, sin cambiar el contrato operativo.
- [x] Traducir juntos `connected/screens/disponibilidad/view.js`, `actions.js`, `payload.js` y `style.css`; conservar `payload`.
- [x] Traducir juntos `connected/modules/disponibilidad/configuration.js` y `payload.js`; conservar `payload`.
- [x] Traducir `demo/availability.js` y `demo/screens/disponibilidad/view.js` sin presentar capacidades ficticias como conectadas.
- [x] Actualizar todas las pruebas de disponibilidad, horarios, grupos, bloqueos y asignaciones.
- [x] Verificar conectado/demo, roles, estados de error, escritorio/móvil y ambos temas.

Resultado: conjunto cerrado el 2026-11-17 en [Disponibilidad](resultado-disponibilidad-2026-11-17.md).

### 8. Agenda — REALIZAR CON MUCHO CUIDADO

La Agenda es el conjunto más grande y actualmente tiene archivos estrechamente relacionados. No debe hacerse un renombrado parcial que deje mezclados imports antiguos y nuevos. La traducción de cada subgrupo debe realizarse en una rama o estado de trabajo estable y con sus pruebas en el mismo cambio.

- [x] Esperar a que los cambios funcionales pendientes de Agenda estén confirmados o separados de esta migración.
- [x] Traducir juntos los archivos de estructura compartida: `view.js`, `frame.js`, `chrome.js`, `panels.js` y `style.css`.
- [x] Traducir juntos navegación y periodo: `navigation.js`, `calendar.css`, `month.js` y `view-preference.js`.
- [x] Traducir juntos presentación temporal: `timeline.js`, `table.js`, `presentation.js`, `polish.css`, `utility.js` y `utility.css`.
- [x] Traducir juntos acciones y filtros: `actions.js`, `filters.js`, `state-menu.js` y `state-menu.css`.
- [x] Traducir juntos los módulos conectados `attention.js`, `cache.js`, `calendar.js`, `errors.js` y `live-refresh.js`.
- [x] Conservar y adaptar los nombres compuestos de `client.js` y `store.js`.
- [x] Traducir juntos `manual-contract.js`, `manual-operation.js`, `schedule-change.js` y `versioned-mutation.js`.
- [x] Traducir juntos la pantalla conectada `view.js`, `live.js`, `manual-view.js`, `presentation.js`, `quick-state.js`, `schedule-editor.js`, `state-editor.js` y `style.css`.
- [x] Traducir juntos `demo/agenda-attention.js` y `demo/agenda-quick-state.js`.
- [x] Actualizar en el mismo proceso todas las pruebas unitarias `agenda-*`, `m4-agenda*`, `m4-manual*`, `m4-live*` y `ala-agenda*`.
- [x] Actualizar en el mismo proceso las pruebas `tests/m4-navegador/agenda-*`, `state-menu`, `live-errors` y fixtures asociados.
- [x] Verificar vistas diaria, semanal y mensual; roles; actualización en vivo; estados; filtros; diálogos; escritorio/móvil; temas; conectado/demo.

Resultado: conjunto cerrado el 2026-11-18 en [Agenda](resultado-agenda-2026-11-18.md).

### 9. Portal público y reservas — REALIZAR CON MUCHO CUIDADO

Este flujo contiene estado de reserva, coordinación entre pestañas, persistencia temporal y contratos públicos. Los nombres contractuales, claves persistentes y valores usados para reanudar intentos no deben cambiar sin migración.

- [x] Traducir juntos `connected/public/entry.js`, `booking.js`, `booking-view.js` y `booking-lifecycle.js`.
- [x] Conservar `attempt-store.js` con el término técnico `store`, traduciendo los conceptos restantes.
- [x] Traducir juntos `selection.js`, `selection-view.js`, `contact.js`, `dates.js` y `submission.js`.
- [x] Traducir juntos `browser-session.js`, `hold-clock.js`, `business-identity.js` y `accessibility.js`.
- [x] Revisar `http.js` sin traducir términos HTTP ni el contrato del backend.
- [x] Traducir juntos `shared/public/options.js`, `options.css` y `connected/public/style.css`.
- [x] Traducir juntos `demo/screens/reservas/booking.js` y `style.css`.
- [x] Actualizar todas las pruebas `portal-publico-*`, `ala-portal-*` y pruebas de navegador del portal.
- [x] Verificar selección, apartado, expiración, reintento, envío, navegación, accesibilidad y múltiples pestañas.

Resultado: conjunto cerrado el 2026-11-18 en [Portal público y reservas](resultado-portal-publico-2026-11-18.md).

### 10. Autenticación y sesión — REALIZAR CON CUIDADO

- [x] Traducir juntos `connected/modules/auth/session.js`, `password-policy.js`, `connected/screens/auth/dialogs.js` y `style.css`.
- [x] Mantener intactas las claves de almacenamiento o implementar una migración explícita antes de cambiarlas.
- [x] Mantener intactos los campos, rutas, roles, códigos y mensajes contractuales del backend.
- [x] Actualizar pruebas de sesión, persistencia, ingreso, cierre de sesión y recuperación.
- [x] Verificar sesión persistente y temporal, expiración y limpieza segura.

Resultado: conjunto cerrado el 2026-11-18 en [Autenticación y sesión](resultado-autenticacion-sesion-2026-11-18.md).

### 11. Cuenta, negocio, licencias y publicación

- [x] Traducir juntos `connected/screens/cuenta/view.js`, `actions.js`, `license-progress.js`, `price-publication.js` y `style.css`.
- [x] Traducir juntos los archivos de `connected/screens/negocio/`: vista, acciones, operaciones/presentación de licencia, historial de correo, cupos y espacio de trabajo.
- [x] Traducir `connected/modules/publicacion/precios.js` respetando los campos contractuales.
- [x] Actualizar pruebas de cuenta, licencias, publicación, cupos y detalle de negocio.
- [x] Verificar permisos, progreso, límites, estados y errores.

Resultado: conjunto cerrado el 2026-11-18 en [Cuenta, negocio, licencias y publicación](resultado-cuenta-negocio-2026-11-18.md).

### 12. Plataforma, permisos y recursos retirados

- [x] Traducir juntos los archivos de `shared/screens/plataforma/`: vista, acciones, directorio, modelo y estilos.
- [x] Traducir juntos `connected/modules/permisos/pages.js` y `roles.js`, conservando los valores contractuales de rol.
- [x] Traducir juntos `connected/modules/recursos/affected.js`, `retired.js` y la pantalla `connected/screens/recursos/retired-view.*`.
- [x] Actualizar pruebas de plataforma, permisos, recursos retirados e inhabilitados.
- [x] Verificar visibilidad por rol y estados activo/inactivo/retirado.

Resultado del 2026-11-20 en [Plataforma, permisos y recursos inhabilitados](resultado-plataforma-permisos-recursos-2026-11-20.md).

### 13. Demo restante

- [x] Traducir juntos `demo/data.js`, `schedule.js`, `entry.js` y los imports que los consumen.
- [x] Traducir juntos las pantallas de resumen, reportes, configuración y notificaciones con sus estilos.
- [x] Revisar que los datos ficticios sigan claramente aislados del modo conectado.
- [x] Actualizar pruebas y verificaciones visuales correspondientes.

Resultado del 2026-11-20 en [Pantallas restantes de la demo](resultado-demo-restante-2026-11-20.md).

### 14. Núcleo compartido — REALIZAR CON MUCHO CUIDADO

Estos archivos son consumidos por gran parte de la aplicación. El conjunto no debe traducirse mientras otros cambios amplios estén activos en las mismas rutas.

- [x] Traducir coordinadamente `main.js`, `entry-router.js`, `connected/entry.js` y los índices de pantallas. Actualizar los imports de `demo/demo.entrada.js` si cambia la interfaz del núcleo.
- [x] Traducir coordinadamente `shared/app.js`, `actions.js`, `data.js`, `ui.js`, `forms.js` e `icons.js`.
- [x] Traducir `shared/calendar-layout.js`, `resource-status.js` y `account-portal.js` con sus pruebas.
- [x] Revisar `connected/backend.js`, `mode.js` y `connected/modules/datos/load.js` sin cambiar contratos ni variables de entorno.
- [x] Ejecutar todas las pruebas unitarias y las pruebas de navegador con API simulada.
- [x] Ejecutar la suite de navegador con MariaDB en un entorno autorizado para preparar una base efímera.

Resultado del 2026-11-20 en [Núcleo compartido](resultado-nucleo-compartido-2026-11-20.md).

### 15. CSS global — REALIZAR CON MUCHO CUIDADO

Los selectores globales y las propiedades personalizadas pueden afectar todas las pantallas. Bootstrap, HTML y ARIA quedan fuera de la traducción.

- [x] Traducir de manera coordinada las clases propias de `shared/styles.css` y sus usos en JavaScript/HTML.
- [x] Traducir las propiedades propias de `shared/theme.css` sin cambiar el sistema visual ni los valores de tema.
- [x] Traducir selectores propios de `shared/mobile.css` sin afectar la navegación inferior.
- [x] Traducir animaciones y selectores propios de `shared/motion.css` respetando preferencias de movimiento reducido.
- [x] Traducir `shared/account-portal.css` y actualizar sus selectores en `shared/cuenta.portal.js`.
- [x] Buscar cada selector anterior en `src/` y `tests/` antes de marcarlo como terminado.
- [x] Verificar las pantallas en escritorio y móvil, en modo claro y oscuro.

Resultado del 2026-11-20 en [CSS global](resultado-css-global-2026-11-20.md).

### 16. Pruebas y fixtures finales

- [x] Traducir nombres internos y descripciones en inglés de pruebas unitarias, sin alterar datos que representen contratos.
- [x] Traducir nombres internos y descripciones de pruebas Playwright.
- [x] Traducir helpers y fixtures propios después de actualizar todos sus consumidores.
- [x] Conservar selectores contractuales o de accesibilidad cuando cambiarlos reduzca la estabilidad de la prueba.
- [x] Buscar imports rotos, rutas antiguas, funciones antiguas y selectores antiguos.
- [x] Ejecutar `npm test`.
- [x] Ejecutar `npm run build`.
- [x] Ejecutar `npm run test:browser` o los proyectos Playwright aplicables.
- [x] Ejecutar `git diff --check`.

Resultado del 2026-11-20 en [Pruebas y datos de prueba](resultado-pruebas-fixtures-2026-11-20.md).

### 17. Documentación y cierre

- [x] Actualizar README, documentos técnicos y ejemplos que usen nombres anteriores.
- [x] Registrar el mapa definitivo de nombres anteriores y nuevos.
- [x] Documentar excepciones que permanecieron en inglés y su motivo.
- [x] Confirmar que conectado y demo usan la misma nomenclatura donde comparten interfaz.
- [x] Confirmar que no se cambió ningún contrato del backend.
- [x] Confirmar que no se introdujeron cambios funcionales o visuales durante la traducción.

Resultado del 2026-11-20 en [Cierre de la traducción](resultado-cierre-2026-11-20.md). La correspondencia de archivos está en el [mapa definitivo](mapa-renombres-frontend.md).

## Criterio para marcar “REALIZAR CON CUIDADO”

Un conjunto recibe esta marca cuando cumple una o más condiciones:

- Tiene muchos consumidores o imports cruzados.
- Mezcla código compartido, conectado y demo.
- Incluye persistencia, rutas, selectores globales o contratos externos.
- Sus archivos no pueden renombrarse de forma parcial sin romper temporalmente el flujo.
- Requiere una verificación visual o funcional extensa.

La marca no impide dividir el trabajo internamente. Indica que cada división debe terminar con el repositorio funcional y que no se debe dejar una mezcla prolongada de nombres anteriores y nuevos.

## Criterio de terminación

La migración estará terminada cuando:

- Todo nombre propio dentro del alcance use la convención acordada.
- Las excepciones en inglés estén registradas.
- No queden referencias involuntarias a los nombres anteriores.
- Los contratos externos y la persistencia sigan siendo compatibles.
- Las pruebas, el build y las verificaciones visuales aplicables sean satisfactorias.
- La documentación refleje el estado realmente implementado.
