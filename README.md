# Cita · Prototipo de gestión de citas

Pantallas navegables con **Vanilla JavaScript y Bootstrap 5**, sin React, Vue ni Angular. Vite solo sirve los archivos y genera la versión estática. La interfaz y los nombres del dominio están en español.

## Ejecutar

```sh
npm install
npm run dev
```

Abre la dirección que imprima Vite. Para compilar: `npm run build`. Para revisar la compilación local: `npm run preview`. Las pruebas unitarias se ejecutan con `npm test`.

### Verlo desde un Android

Conecta el teléfono y esta computadora a la misma red Wi-Fi y ejecuta `npm run dev`. Vite muestra una dirección **Network** como `http://192.168.x.x:5173/`; abre esa dirección en el navegador del teléfono. Se usa la IP de la computadora, no la del teléfono. Si cambia la red o la IP, usa la nueva dirección que imprima Vite. El servidor debe permanecer abierto mientras pruebas el prototipo.

El botón de luna o sol del encabezado cambia entre modo claro y oscuro; la elección se recuerda en ese navegador. En pantallas estrechas, la agenda inicia en vista diaria y las franjas del horario semanal se presentan como tarjetas.

El panel conectado requiere la API del backend y una cuenta activa. La entrada pública `/reservas/:slug` inicia una sesión anónima sin login administrativo y permite seleccionar oferta/horario, conceder un apartado, capturar contacto y enviar una reserva pendiente a la API, con recuperación de envíos inciertos (T098–T114). Requiere la API y su configuración de mismo origen; no utiliza datos de demo ante fallos. La demo (`?demo=1`) lee datos ficticios mediante `fetch('/data/demo.json')`, sin credenciales ni API. Las entradas se eligen en `src/entrada.enrutador.js`. Las pantallas y los estilos comunes viven en `src/shared/`. El servidor que publique `dist/` debe resolver rutas desconocidas a `index.html` (fallback de SPA).

## Integración con el backend actual

- La ruta sin parámetros abre la versión conectada. Inicia sesión con una cuenta del backend.
- Configura `VITE_API_URL` en `.env` si la API no está en `http://localhost:3000`. No agregues `/api`: el backend actual no utiliza ese prefijo. Reinicia Vite al cambiar esta variable.
- Para comparar, usa **Ver demo** en el encabezado o agrega `?demo=1` a cualquier ruta. El enlace **Prototipo** vuelve a la versión conectada. El modo se conserva al navegar y recargar.
- Administración: profesionales (identidad, contraseña y asignaciones), servicios, sucursales, semana completa con múltiples franjas donde una pausa se representa con dos franjas separadas, y creación/eliminación de bloqueos.
- Profesional: sus servicios, horarios y bloqueos. La API restringe el catálogo de sucursales a administración; en este rol se muestran los IDs de las sucursales presentes en su horario.
- Superadministración: negocios, registro con RFC y límite de sucursales, suspensión/reactivación y renovación de licencias según el servidor.
- Agenda conectada: comparte filtros y calendario con la demo y usa un resumen compacto del periodo filtrado. Administración/Recepción consultan citas, detalle e historial, crean citas manuales con recuperación de envíos inciertos y cambian estado y horario con la versión observada. Profesional solo consulta sus citas. Clientes permite buscar, paginar, consultar ficha e historial, crear y corregir fichas por ID; admite teléfonos compartidos y conserva los contactos históricos de las citas. Los formularios usan paneles laterales y no reenvían conflictos automáticamente. Véanse [consulta T088–T092](docs/Fase-5-modulo-4/resultados-tareas/m4-t088-t092.md), [alta y estado T093–T096](docs/Fase-5-modulo-4/resultados-tareas/m4-t093-t096.md), [horario y fichas T097–T099](docs/Fase-5-modulo-4/resultados-tareas/m4-t097-t099.md) y [paridad visual](docs/Fase-5-modulo-4/resultados-tareas/ajuste-agenda-paridad-demo-2026-11-11.md). La agenda se actualiza cada 30 segundos mientras está visible y al recuperar foco; los editores avisan si cambia su versión sin borrar lo escrito. Vacío y errores se distinguen con mensajes seguros y se conserva el foco/cursor en refrescos y paginación. Véase [actualización, errores, teclado y pruebas T100–T103](docs/Fase-5-modulo-4/resultados-tareas/m4-t100-t103.md). La evidencia M4 de navegador usa API simulada; no certifica el backend real. Parada en T103.
- Reportes y WhatsApp continúan pendientes en conectado. La configuración conectada de reglas de agenda está en Disponibilidad, con modo y tiempo entre citas vigentes del backend. El acceso al portal desde el panel está en Mi cuenta; su entrada `/reservas/:slug` permite consultar oferta, apartar, enviar y recuperar el resultado propio de una reserva pendiente.
- Agenda en demo/conectado usa un resumen compacto del periodo filtrado, leyenda superior y controles de filtros/búsqueda alineados. La versión conectada reutiliza snapshots completos en memoria durante 30 segundos para filtrar sin peticiones adicionales y dispone de actualización manual. Día/Semana muestran «Sin atención» con profesional y sucursal seleccionados usando el GET autorizado de atención; los fallos y omisiones no inventan cierres. Los tramos semanales saturados abren Día con desplazamiento, foco y resaltado; se conserva el acceso a todas sus citas mediante desplazamiento horizontal. La hora actual se dibuja solo en hoy cuando hay una zona inequívoca. Se mantienen skeleton sin caché, advertencias de citas afectadas, detalle y editores laterales con borradores en memoria. Véanse [implementación, pruebas y límites](docs/Fase-5-modulo-4/resultados-tareas/agenda-utilidad-cache-densidad-2026-11-12.md) y [evidencia del refinamiento anterior](docs/Fase-5-modulo-4/resultados-tareas/agenda-carga-estados-paneles-2026-11-11.md).
- El selector del espacio permite cerrar sesión. El acceso del panel se conserva en este navegador al cerrarlo y reabrirlo; antes de cargar datos se valida con `/auth/profile`. No se renueva su vencimiento: el backend limita la sesión a 12 horas y puede invalidarla antes. Cerrar sesión, cambiar contraseña o recibir 401 retira el acceso local. Véanse [funcionamiento, pruebas y límites](docs/traduccion-nomenclaturas/resultado-autenticacion-sesion-2026-11-18.md). Los errores de la API se muestran en los formularios.
- La carpeta del backend se conserva como fuente de consulta: esta integración solo modifica el frontend.

### Entrada pública conectada: T098–T124

En el panel, administración dispone de **Mi cuenta → Tu portal de reservas → Abrir portal / Copiar enlace**. Requiere el backend actualizado con `identificadorPublico` en login/perfil; al recargar se obtiene el dato con la sesión vigente. Si falta un identificador válido, se informa y se deshabilitan las acciones. [Contrato, pruebas y evidencia del acceso](docs/fase-4/resultados-tareas/resultado-acceso-portal-perfil.md).

T115 añade avisos accesibles en una región estable, restauración de foco visible y ajustes móviles. T116 amplía las pruebas de invalidación, respuestas fuera de orden, contacto en memoria e incertidumbre. Detalle y evidencia en [T115–T116](docs/fase-4/resultados-tareas/resultado-t115-t116.md). Las pruebas Playwright T117–T124 usan el portal, la API real y una base efímera de MariaDB. El usuario configurado para pruebas en `../backend/.env.test.local` necesita permiso para crear y eliminar esa base. [Flujo y resultados de la integración](docs/fase-4/resultados-tareas/resultado-t117-t124.md)

- `npm test` ejecuta las pruebas unitarias.
- `npm run test:browser -- --config tests/m4-navegador.config.js` ejecuta Playwright en Microsoft Edge con API simulada.
- `npm run test:browser` ejecuta la integración real con MariaDB y Microsoft Edge. En PowerShell, establece `$env:PORTAL_TEST_BACKEND_READ_ONLY='1'` para usar el backend ya compilado y limitar las escrituras a la base efímera de la corrida.

El cliente público llama exclusivamente a `/publico/negocios/:slug/...` bajo el mismo origen del frontend, con cookie HttpOnly y protección CSRF. No usa el JWT del panel ni llama directamente a `VITE_API_URL`. En desarrollo, `vite.config.js` dirige `/publico` hacia `VITE_API_URL` (por defecto `http://localhost:3000`) sin cambiar el encabezado Origin ni la ruta de la cookie.

La API debe tener configurados `PORTAL_PUBLICO_ORIGEN` con el origen exacto de Vite y `PORTAL_CSRF_SECRET` con un secreto de servidor válido. Esta entrega no modifica esas variables en el backend; nunca deben trasladarse a variables `VITE_*`. Se necesitan HTTPS o localhost, Web Locks, BroadcastChannel y cookies habilitadas. Una dirección HTTP de red local puede no ofrecer las APIs de contexto seguro.

El proxy anterior es solo de desarrollo: `dist/` y `npm run preview` requieren un proxy de mismo origen externo para una sesión conectada. La configuración de Nginx sigue pendiente de acordar dominio, HTTPS y ubicación de la API. Evidencia y límites: [resultado T098–T100](docs/fase-4/resultados-tareas/resultado-t098-t100.md) y [resultado T101–T103](docs/fase-4/resultados-tareas/resultado-t101-t103.md).

La selección invalida las opciones posteriores cuando cambia un dato y descarta respuestas antiguas. El selector de fecha consulta un día por petición, sin imponer un horizonte diferente del servidor, y muestra las horas en la zona IANA devuelta por la API. Una consulta fallida ofrece reintento y no se presenta como agenda vacía. Elegir un horario aún no lo aparta.

**Apartar este horario** solicita una concesión al servidor con una clave estable para sus reintentos. Solo abre contacto después de verificar el apartado propio. El contador usa la hora y vencimiento del servidor y no se amplía por actividad. Las pestañas se avisan con BroadcastChannel y consultan la vigencia al reenfocar. Volver confirma la liberación del ID/generación propios; salir o recargar intenta liberarlo con `fetch` y `keepalive`. La salida no garantiza entrega y sigue aplicando el vencimiento del servidor.

Nombre, teléfono y notas se conservan únicamente en memoria durante la navegación interna. **Revisar datos** valida localmente. **Reservar** confirma primero en sessionStorage un marcador con solo negocio, apartado y clave de intento, prepara ese intento y envía el contacto normalizado. Un reintento conserva clave y contenido; ante incertidumbre no se inicia otra reserva ni se libera el apartado al salir.

Una recarga con marcador consulta el resolutor antes de cargar catálogos: muestra el resultado guardado o reinicia solo después de una ausencia terminal comprobada. Sin marcador, la recarga reinicia y no restaura el formulario. El resumen usa folio, nombres, fecha/hora/zona y costo guardados, siempre con estado pendiente. Evidencia: [T104–T109](docs/fase-4/resultados-tareas/resultado-t104-t109.md) y [T110–T114](docs/fase-4/resultados-tareas/resultado-t110-t114.md).

Límite actual del backend: obtener CSRF al recargar depende de la inicialización pública, que exige licencia para nuevas reservas. Si la licencia impide esa inicialización, se conserva el marcador y se informa de recuperación pendiente; el frontend no puede recuperar por sí solo el resultado en ese escenario. El ajuste necesario de la sesión existente se describe en el resultado T110–T114 y no se implementó en el backend. Las pruebas de este lote utilizan API ficticia/dobles, sin validar una base real.

Para verificar la navegación y la reserva de demostración en Edge con respuestas HTTP simuladas, ejecuta `npm run dev` y luego `node tests/portal.navegacion-navegador.mjs`. La [nota de traducción del portal](docs/traduccion-nomenclaturas/resultado-portal-publico-2026-11-18.md) documenta las comprobaciones y el servidor simulado del flujo conectado.

## Pantallas de la demo

| Ruta                          | Contenido                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/` o `/admin/agenda`         | Calendario día, semana y mes; filtros de sucursal, profesional, estado y nombre; ficha de cita; creación manual y cambio de estado. |
| `/admin/resumen`              | Indicadores, distribución semanal y citas del día.                                                                                  |
| `/admin/clientes`             | Búsqueda, alta de cliente y ficha con historial.                                                                                    |
| `/admin/profesionales`        | Equipo, especialidades, servicios y sucursales asignados; alta y edición.                                                           |
| `/admin/servicios`            | Catálogo, duración y precio informativo; alta y edición.                                                                            |
| `/admin/sucursales`           | Ubicaciones, teléfonos y notas de llegada; alta y edición.                                                                          |
| `/admin/disponibilidad`       | Varias franjas semanales por día y sucursal, días diferenciados por color, descansos, bloqueos y modo de agenda.                   |
| `/admin/reportes`             | Rango de fechas, atendidas, canceladas, no asistencias e ingresos estimados por servicio/sucursal.                                  |
| `/admin/notificaciones`       | Configuración y vista previa de WhatsApp; bitácora ilustrativa.                                                                     |
| `/admin/configuracion`        | Datos del negocio, enlace público y cambio de negocio de demostración.                                                              |
| `/admin/plataforma`           | Vista de superadministración: registro, suspensión y renovación simulada de licencia.                                               |
| `/reservas/clinica-bienestar` | Reserva pública de Clínica Bienestar en seis pasos.                                                                                 |
| `/reservas/espacio-mente`     | Segundo negocio, catálogo propio y modo de agenda compacta.                                                                         |

## Recorrido sugerido de la demo

1. Abre una cita del calendario y cambia su estado.
2. Usa **Nueva cita** para probar agendamiento manual. El profesional cambia de sucursal según el día: en los ejemplos, Centro lunes/miércoles/viernes y Norte martes/jueves.
3. Abre **Portal de reservas** y completa Servicio → Sucursal → Profesional → Fecha/hora → Datos → Confirmación con nombre ficticio y teléfono inventado de 10 dígitos.
4. Verifica el folio y usa **Ver cita en el panel**. La cita aparece en el mismo estado en memoria.
5. En **Disponibilidad**, selecciona a la Dra. Ana Martínez y revisa las dos franjas del sábado, agrupadas por color: trabaja en Norte de 09:00 a 13:00 y en Centro de 14:00 a 18:00. Usa **+** para agregar otra franja. Prueba un empalme: el formulario señala el conflicto y conserva el horario guardado.
6. Abre el portal, elige Consulta general y a la Dra. Ana. El sábado 12 de septiembre de 2026 ofrece horas de la mañana en Norte y de la tarde en Centro.
7. Cambia de espacio de trabajo con el selector lateral para explorar Espacio Mente.
8. En **Reportes**, aplica un rango y usa **Guardar como PDF**; selecciona ese destino en la impresión del navegador.

## Alcance de la demo

Las reglas siguientes describen exclusivamente `?demo=1`. La integración del panel y del portal conectado se detalla arriba; el SQL de referencia de este repositorio no se ejecuta contra el backend.

- Todos los datos y cambios son ficticios y permanecen **solo en la memoria de esta pestaña**. Recargar restablece la demostración. No se usa almacenamiento del navegador para datos de pacientes.
- Fecha de ejemplo: **8 de septiembre de 2026**. La línea horaria de la agenda es una referencia visual a las 11:20, no un reloj en vivo. Se pueden explorar otros días.
- El motor local considera duración, cierre, varias franjas por día y sucursal, descanso, citas y bloqueos. El formulario ofrece fechas hasta 45 días en el futuro y horas en incrementos de 15 minutos.
- La agenda compacta ofrece horarios contiguos; si aún no hay un borde libre, comienza con el primer horario disponible. El portal ofrece solo el primer día disponible. Cuando se llena, avanza al siguiente día hábil de la sucursal seleccionada.
- El apartamiento de 5 minutos funciona **en esta pestaña**. Se valida de nuevo al confirmar y caduca si se abandona. No hay exclusión mutua entre navegadores, usuarios o servidores.
- El selector de negocios y la vista de superadministración son controles de demostración, **no permisos**. El JSON público contiene todos los datos ficticios. Los filtros locales **no garantizan seguridad multi-tenant ni protección anti-IDOR**.
- WhatsApp muestra plantillas y opciones; **no envía mensajes**. Las licencias no se facturan ni activan cuentas reales.
- Los reportes se guardan a través de la impresión del navegador. No existe un generador PDF en el servidor. Los ingresos de la demo usan el precio actual del catálogo de las citas completadas.
- No se incluyen pagos ni cobros.

## Estructura

```text
src/
  aplicacion.entrada.js                  # Punto de entrada de index.html
  entrada.enrutador.js                   # Selección de portal, panel o demo
  connected/
    conectado.entrada.js
    backend.js                           # Fachada para las vistas comunes
    conexion.modo.js
    modules/autenticacion/sesion.estado.js
    portal-publico/portal.entrada.js
    screens/pantallas.conectadas.js
  demo/
    demo.entrada.js
    demo.datos.js
    demo.horario.js
    disponibilidad.motor.js
    screens/pantallas.demo.js
  shared/
    aplicacion.nucleo.js                 # Navegación, estado y render compartidos
    aplicacion.acciones.js
    formularios.componentes.js
    global.estilos.css
    tema.estilos.css
    movil.estilos.css
    movimiento.estilos.css
    screens/                            # Agenda, catálogos y otras vistas comunes
public/data/demo.json                   # Catálogos ficticios de dos negocios
tests/                                 # Unitarias y recorridos independientes
  datos-prueba/
  m4-navegador/                         # Playwright con API simulada
  navegador/                            # Playwright con API real y MariaDB efímera
docs/
```

El historial de la migración, las rutas vigentes y las excepciones de nomenclatura están en el [cierre del plan](docs/traduccion-nomenclaturas/resultado-cierre-2026-11-20.md) y el [mapa de renombres](docs/traduccion-nomenclaturas/mapa-renombres-frontend.md).

## Estilo de cristal

La clase reutilizable `.efecto-cristal` está en `src/shared/global.estilos.css` y usa blanco al 20 %, desenfoque de 7 px, borde blanco al 30 % y sombra de 30 px. Se aplica a los diálogos y avisos del prototipo. El exterior del diálogo permanece nítido y transparente; el modo oscuro adapta el vidrio y el texto. El selector de negocio y el resumen del portal usan variantes adecuadas a sus fondos.

## Configuración


Copia `.env.example` a `.env` si deseas cambiar el nombre, fecha de referencia o URL de la API. Las variables `VITE_*` son públicas: **nunca deben contener secretos**. Los cambios requieren reiniciar Vite. El frontend usa la API configurada; ninguna credencial está incluida en el repositorio.

## Modelo SQL de referencia

El script `db/schema.sql` propone una base separada, `citas_saas_prototipo`, y conserva la terminología del esquema proporcionado. **No se ejecutó contra MySQL/MariaDB**. Se instala en una base vacía con un cliente SQL y un usuario autorizado. No es una migración del proyecto existente ni una base conectada a estas pantallas.

Las claves foráneas compuestas impiden relaciones cruzadas entre negocios. Se agregan configuración de agenda, licencias, vinculación de profesionales y usuarios, pertenencia de las tablas puente, precio acordado y fila de exclusión por profesional/día. La futura API todavía debe implementar la autorización y las transacciones descritas en `docs/arquitectura-seguridad.md`.

Bootstrap se distribuye por npm; tipografías DM Sans y Manrope se cargan de Google Fonts y tienen respaldo local `sans-serif`. Las sucursales incluyen diagramas decorativos, no mapas geográficos reales.
