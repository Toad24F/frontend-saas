# Resultado FALA-T051–T053

## Qué se hizo y cómo funciona

En la vista **conectada** de Disponibilidad, el Administrador o el Profesional selecciona una persona y abre **Horario semanal**. Cada fila activa define sucursal, entrada y salida. Para dejar una pausa, termina una franja y añade otra después; no existe un campo de descanso dentro de la franja. Al guardar, el frontend envía la semana completa a `PUT /profesionales/:id/horario`. La tabla conectada tiene cinco columnas y se adapta a móvil. La demo conserva sus datos y el control ficticio de descanso, porque su comportamiento es independiente.

La pestaña **Bloqueos** sigue permitiendo registrar periodos sin atención. La vista conectada deja de consultar, crear y borrar excepciones por fecha, cuyas rutas ya no existen en la API. Su carga de oferta solo llama a `/profesionales/:id/oferta`; el formulario y los mensajes de excepciones se retiraron. Los horarios históricos que requieran transición de datos siguen siendo responsabilidad del backend.

En **Horarios disponibles**, Administrador y Recepción pueden consultar dentro de su negocio; el Profesional consulta su propia identidad. La modalidad **manual** pertenece a esa consulta privada y no aparece en el portal público. El resultado muestra espacios disponibles, sin crear una reserva. La descripción de reglas de la consulta distingue el intervalo de la demo del tiempo entre citas del modo conectado.

## Archivos afectados

| Archivo | Función del cambio |
| --- | --- |
| `src/shared/screens/disponibilidad/view.js` | Renderiza cinco columnas sin descanso en conectado, conserva el descanso ficticio en demo y presenta solo Bloqueos en la pestaña correspondiente. |
| `src/shared/screens/disponibilidad/style.css` | Ajusta la cuadrícula móvil de cinco columnas para las franjas conectadas. |
| `src/connected/screens/disponibilidad/view.js` | Deja de cargar estado y contenido de excepciones; mantiene oferta, horarios y bloqueos. |
| `src/connected/screens/disponibilidad/actions.js` | Retira las acciones y solicitudes de excepciones por fecha; conserva guardado semanal y acciones de bloqueos. |
| `src/connected/screens/disponibilidad/payload.js` | Elimina la construcción del payload de excepciones obsoleto. |
| `src/connected/screens/disponibilidad/style.css` | Elimina estilos del formulario de excepciones retirado. |
| `src/connected/modules/datos/load.js` | Ya no introduce campos de descanso al leer franjas del backend. |
| `src/shared/screens/disponibilidad/errors.js` | Retira validadores de excepciones sin uso; mantiene las validaciones de horario y demo. |
| `src/shared/screens/disponibilidad/branch-assignments.js` | Actualiza el aviso de asignación para referirse a horarios y bloqueos vigentes. |
| `src/shared/screens/disponibilidad/operational.js` | Muestra las reglas y la modalidad de consulta según conectado o demo. |
| `tests/browser/global-setup.js` | Da contraseña válida al Profesional ficticio de la base temporal para probar su acceso real. |
| `tests/browser/agenda-semana-roles.spec.js` | Añade pruebas de interfaz, roles y contrato API; reutiliza la sesión ficticia del administrador para respetar el límite de cinco logins por IP. |
| `tests/disponibilidad-conectada.test.js`, `tests/disponibilidad-errores.test.js` | Retiran expectativas de payload y validación de excepciones que dejaron de formar parte del frontend. |
| `docs/actual.md` | Documenta las franjas sin descanso, el 404 de las rutas retiradas y el uso de bloqueos. |
| `resultado-t048-t050.md` | Corrige el pendiente histórico de T051 tras su implementación. |
| `tareas.md` | Marca T051, T052 y T053 como hechas. |

## Pruebas y resultados

Se escribieron primero las pruebas de navegador. T051 falló inicialmente porque el formulario conectado aún renderizaba 14 campos de descanso. Después de retirar esos campos y las llamadas obsoletas, pasó. T052 se ajustó para abrir la pestaña de consulta antes de hacer la petición real. En la corrida conjunta, el backend limitó los inicios de sesión a cinco por IP; el helper ahora reutiliza el token del Administrador ficticio y los cinco casos de regresión pasan juntos.

`npx playwright test tests/browser/agenda-semana-roles.spec.js tests/browser/agenda-configuracion.spec.js` con `PORTAL_TEST_BACKEND_READ_ONLY=1`: **5/5**. T051 comprueba que no existan controles de descanso conectados ni peticiones a excepciones, que Bloqueos siga visible y que la demo conserve su control ficticio. T052 consulta por API como Administrador, Recepción y Profesional, verifica la restricción a otro perfil y comprueba que el portal público no exponga modalidad manual. T053 prueba contra la API los valores 0, 5 y 60, rechazos de −5, 7 y 65, dos franjas separadas, la desaparición de ranuras tras un bloqueo y 404 en GET/PUT/DELETE de excepciones. Los casos anteriores T048–T050 también pasan en esa corrida.

`npm test`: **187/187**. `npm run build` y `git diff --check`: correctos. Se revisaron capturas conectadas en escritorio y móvil, temas claro y oscuro, y la demo móvil. Las pruebas de navegador usan únicamente la base efímera configurada mediante `.env.test.local`; el backend y su base habitual no se modificaron.
