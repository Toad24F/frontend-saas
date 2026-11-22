# Fase 6, T030–T034 — Acciones de agenda del Profesional

## Cambio y motivo

La agenda conectada del Profesional ahora muestra alta manual, cambio de horario y cambio de estado de sus citas. La consulta de clientes continúa restringida a Administración y Recepción. En el alta, el perfil profesional aparece fijo, se capturan nombre y teléfono del paciente y no se muestra búsqueda ni selección de una ficha. Esto corresponde al contrato del backend de fase 6: el servidor vuelve a resolver el perfil y decide la disponibilidad y el cliente asociado.

## Flujo conectado

1. La sesión carga servicios y sucursales asignados al Profesional. Su agenda muestra solo citas autorizadas por el servidor.
2. «Nueva cita» abre el formulario con el perfil fijo. El usuario consulta horarios; el navegador presenta únicamente ranuras devueltas por `/disponibilidad` y solicita nombre y teléfono.
3. El envío conserva la clave de intento. Preparar y registrar envían `clienteNuevo`, nunca `clienteId`; una respuesta incierta se resuelve con la misma clave. La agenda se actualiza después de un registro confirmado.
4. Al abrir una cita propia, estado y horario usan la versión del detalle. Ante conflicto, el borrador permanece hasta actualizar. Si se mueve una cita pendiente, el cliente acepta el estado confirmado devuelto por backend.

## Archivos y función

| Archivo | Función del cambio |
| --- | --- |
| `src/connected/modules/agenda/agenda.contrato-manual.js` | Separa permisos de agenda de permisos del directorio y fija `personalId` desde la sesión para el Profesional. |
| `src/connected/screens/agenda/agenda.vista.js` | Muestra alta y acciones de agenda para el nuevo rol. |
| `src/connected/screens/agenda/agenda.vista-manual.js` | Compone el formulario de contacto sin directorio y conserva borradores e intentos. |
| `src/connected/screens/agenda/agenda.editor-estado.js` | Habilita el editor de estado para citas propias. |
| `src/connected/screens/agenda/agenda.editor-horario.js` | Habilita cambio de horario y acepta pendiente → confirmada al mover. |
| `src/connected/screens/agenda/agenda.estado-rapido.js` | Expone las acciones rápidas de estado al Profesional. |
| `tests/agenda.profesional.test.js` | Comprueba permisos de agenda y selección manual sin ID de ficha. |
| `tests/m4-navegador/agenda.profesional.spec.js` | Comprueba interfaz y ausencia de consultas al directorio en escritorio y móvil, claro y oscuro. |
| `tests/m4-navegador/agenda.alta-manual.spec.js` | Actualiza el caso histórico de permisos del Profesional. |
| `tests/m4-navegador/agenda.menu-estado.spec.js` | Actualiza la expectativa del menú propio en las tres vistas. |
| `tests/m4-navegador/agenda.escala-compacta.spec.js` | Acepta las dos formas equivalentes con las que Chromium informa la alineación CSS. |

## Comprobaciones y resultado

Primero se añadieron pruebas unitarias y de integración HTTP; fallaron por permisos y alcance faltantes. Después de implementar:

- `npm test`: **302/302** pruebas. Cubre además contratos y regresiones del frontend.
- Pruebas de navegador afectadas: **33/33**, con alta y menú del Profesional, sin llamada a `/clientes`, en ambos tamaños y temas.
- Suite completa de navegador (`npx playwright test --config tests/m4-navegador.config.js --reporter=dot`): **159/159**.
- Capturas del formulario conectadas en 1366 px y 390 px, claro y oscuro: revisadas; perfil fijo, contacto, pie del diálogo y navegación móvil son legibles y operables.
- `npm run build`: correcto, 191 módulos transformados.
- La suite HTTP y la matriz de backend se describen en el documento de resultados M5-T030–T034 del repositorio backend.

## Alcance y pendientes

El cambio afecta la agenda conectada. La demo mantiene su simulación explícita y no usa las rutas reales. El perfil, la licencia, la pertenencia de la cita y los conflictos se validan en backend. No se creó acceso al directorio para el Profesional. No hay cambios de Nginx ni migraciones.
