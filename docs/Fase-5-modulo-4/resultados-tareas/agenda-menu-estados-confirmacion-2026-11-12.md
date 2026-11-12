# Agenda: menú de estados y confirmación de cancelación

Fecha: 2026-11-12. Revisión base frontend: `e889f98c265a1bf5eb8dbef2eb74d68a93eb79a4`, con cambios locales de este ajuste. Solicitud: cambiar estados rápidamente desde la agenda y confirmar la cancelación mediante un modal.

## Comportamiento

- Administración y Recepción pueden abrir el menú con clic derecho sobre una cita o con pulsación larga táctil en Día, Semana y Mes. Se retiró el botón de tres puntos. Las agrupaciones semanales siguen abriendo el día, donde cada cita tiene su propio menú contextual. Profesional mantiene solo consulta.
- El menú consulta el detalle autorizado antes de ofrecer acciones y muestra el estado actual. Flechas, Inicio/Fin, Escape, Tab y Shift+F10 permiten operar sin ratón. Los controles tienen nombres accesibles, foco visible y objetivos de 44 px; el menú se coloca dentro del viewport.
- Los estados finales se deshabilitan antes del fin de la cita. Las canceladas cuyo inicio ya pasó no ofrecen reactivación. La orientación temporal usa instantes UTC cuando existen y la zona histórica para datos civiles; el backend sigue validando licencia, permisos, oferta, horario, ocupación y versión.
- Cada escritura conectada usa `PATCH /citas/:id/estado` con la versión del detalle leído, estado y motivo. No se reenvía automáticamente un fallo ni se adopta una versión nueva silenciosamente. Un conflicto o respuesta incierta ofrece actualizar la cita o consultar su detalle; no anuncia éxito.
- Elegir Cancelada abre un diálogo nativo independiente, también desde el editor del detalle. Muestra paciente, servicio, sucursal, fecha, hora y zona, explica que libera el horario y admite motivo opcional. «Conservar cita» tiene el foco inicial; este botón y Escape no envían nada. Solo «Sí, cancelar cita» confirma la acción. El motivo y la versión del editor se conservan al desistir.
- Tras una respuesta válida se vuelve a consultar la agenda y se recupera el foco en la cita, o en Hoy si desapareció por los filtros. La demo comparte presentación y confirmación con datos locales y mensajes explícitos. Su reactivación rápida remite al detalle, donde ya existe la simulación de ocupación; no se atribuye a la demo la validación transaccional real.

## Archivos

- [Menú, restricciones orientativas y diálogo compartidos](../../../src/shared/screens/agenda/state-menu.js), [estilos](../../../src/shared/screens/agenda/state-menu.css), [tarjetas por hora](../../../src/shared/screens/agenda/timeline.js) y [mes](../../../src/shared/screens/agenda/month.js).
- [Escritura conectada](../../../src/connected/screens/agenda/quick-state.js), [vista conectada](../../../src/connected/screens/agenda/view.js) y [editor existente](../../../src/connected/screens/agenda/state-editor.js).
- [Acciones de demo](../../../src/demo/agenda-quick-state.js), [vista compartida](../../../src/shared/screens/agenda/view.js) y [detalle de demo](../../../src/shared/screens/agenda/actions.js).
- [Once casos nuevos de navegador](../../../tests/m4-browser/state-menu.spec.js) y [regresión manual adaptada a la confirmación](../../../tests/m4-browser/manual.spec.js).

## Ajuste puntual: sin tres puntos y pulsación larga

Se conserva el menú, sus estados, confirmaciones, permisos y escrituras. La propia tarjeta es el ancla accesible del menú; el clic/toque breve conserva el detalle y Shift+F10/tecla de menú contextual conservan la apertura por teclado. Una pulsación táctil de 500 ms abre el menú y bloquea el clic posterior de ese gesto para evitar abrir también el detalle. Mover el dedo más de 10 px, soltar antes, cancelar el puntero o comenzar un desplazamiento cancela el temporizador; no se bloquea el desplazamiento normal de la página. Se elimina el espacio y el estilo que reservaba el botón de tres puntos, también en Mes.

Archivos de este ajuste: `state-menu.js`, `state-menu.css`, `timeline.js`, `month.js` y `tests/m4-browser/state-menu.spec.js`. Se mantienen los demás cambios que ya existían en el árbol del usuario. Alcance: conectado/demo, Día/Semana/Mes, ambos temas y escritorio/móvil; sin cambios del backend.

Verificación del ajuste: 268/268 unitarias, compilación y `diff --check` aprobados; 13/13 pruebas enfocadas del menú aprobadas con HTTP interceptado. Se añadieron dos casos para toque breve/pulsación larga y cancelación del gesto, y se adaptaron las activaciones anteriores por botón a clic derecho o puntero táctil simulado. Se revisaron capturas del menú en móvil oscuro conectado y escritorio claro demo; la suite genera las cuatro combinaciones de tamaño/tema en ambos modos. No se atribuye una ejecución completa nueva ni una prueba en dispositivo físico.

## Verificación original del menú y confirmación

- `npm test`: 268 aprobadas, sin omitidas.
- `npm run build`: aprobado.
- `git diff --check`: aprobado; Git informa únicamente normalización LF/CRLF prevista.
- `npx playwright test --config tests/m4-playwright.config.js`: 78 aprobadas, sin omitidas, en la ejecución final (3,5 minutos; Edge/Chromium con HTTP interceptado).
- Revisión visual de capturas de menú y confirmación en 1366×900 y 390×900, claro/oscuro, conectado/demo. Las capturas se generan en `test-results/m4/state-menu-*` y `state-cancel-*`. Se revisaron también el aislamiento del modal, la legibilidad y los colores semánticos de la leyenda.

En la primera prueba nueva se detectó que Guardar estado quedaba sin foco al conservar la cita; se corrigió y la suite enfocada pasó sus 11 casos. La primera regresión completa pasó 77/78: el caso anterior de cancelación esperaba un PATCH sin confirmar. Se adaptó para pulsar la confirmación tanto ante 409 como ante éxito y esperar la versión confirmada. Se comprobó además el bloqueo de dos activaciones seguidas de un cambio rápido y el retorno de foco tras la reconsulta.

Se aplicó la guía local `ui-ux-pro-max` de accesibilidad, teclado, foco, acciones destructivas y objetivos táctiles, conservando marca y paleta. El buscador Python de la skill no estuvo disponible; se consultó su referencia local y se usaron componentes y patrones existentes como base.

## Alcance y límites

Fuentes consultadas: [constitución](../../../../backend/docs/fase-5-modulo-4/constitucion-modulo-4.md), [especificación](../../../../backend/docs/fase-5-modulo-4/spec.md), [plan](../../../../backend/docs/fase-5-modulo-4/plan.md), [tareas](../../../../backend/docs/fase-5-modulo-4/tareas.md), reglas del proyecto, servicios y contratos actuales de consulta/cambio de estado. Solo se modifica frontend. No se escriben datos reales ni se cambia el backend.

Las pruebas de navegador interceptan HTTP y verifican UI/contratos; no acreditan integración contra Nest/MariaDB ni cierran T104 o tareas posteriores. No se cambian casillas de tareas ni se declara el módulo finalizado. El frontend no tiene un script de lint; no se atribuye esa verificación.

