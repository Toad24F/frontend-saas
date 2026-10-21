# Cita · Prototipo de gestión de citas

Pantallas navegables con **Vanilla JavaScript y Bootstrap 5**, sin React, Vue ni Angular. Vite solo sirve los archivos y genera la versión estática. La interfaz y los nombres del dominio están en español.

## Ejecutar

```sh
npm install
npm run dev
```

Abre la dirección que imprima Vite. Para compilar: `npm run build`. Para revisar la compilación local: `npm run preview`. Las verificaciones del motor de demostración se ejecutan con `npm test`.

### Verlo desde un Android

Conecta el teléfono y esta computadora a la misma red Wi-Fi y ejecuta `npm run dev`. Vite muestra una dirección **Network** como `http://192.168.x.x:5173/`; abre esa dirección en el navegador del teléfono. Se usa la IP de la computadora, no la del teléfono. Si cambia la red o la IP, usa la nueva dirección que imprima Vite. El servidor debe permanecer abierto mientras pruebas el prototipo.

El botón de luna o sol del encabezado cambia entre modo claro y oscuro; la elección se recuerda en ese navegador. En pantallas estrechas, la agenda inicia en vista diaria y las franjas del horario semanal se presentan como tarjetas.

El panel conectado requiere la API del backend y una cuenta activa. La entrada pública `/reservas/:slug` inicia una sesión anónima sin login administrativo y permite seleccionar oferta/horario, conceder un apartado, capturar contacto y enviar una reserva pendiente a la API, con recuperación de envíos inciertos (T098–T114). Requiere la API y su configuración de mismo origen; no utiliza datos de demo ante fallos. La demo (`?demo=1`) lee datos ficticios mediante `fetch('/data/demo.json')`, sin credenciales ni API. Las entradas se eligen en `src/entry-router.js`; las pantallas y estilos comunes viven en `src/shared/`. El servidor que publique `dist/` debe resolver rutas desconocidas a `index.html` (fallback de SPA).

## Integración con el backend actual

- La ruta sin parámetros abre la versión conectada. Inicia sesión con una cuenta del backend.
- Configura `VITE_API_URL` en `.env` si la API no está en `http://localhost:3000`. No agregues `/api`: el backend actual no utiliza ese prefijo. Reinicia Vite al cambiar esta variable.
- Para comparar, usa **Ver demo** en el encabezado o agrega `?demo=1` a cualquier ruta. El enlace **Prototipo** vuelve a la versión conectada. El modo se conserva al navegar y recargar.
- Administración: profesionales (identidad, contraseña y asignaciones), servicios, sucursales, semana completa con múltiples franjas y descansos, y creación/eliminación de bloqueos.
- Profesional: sus servicios, horarios y bloqueos. La API restringe el catálogo de sucursales a administración; en este rol se muestran los IDs de las sucursales presentes en su horario.
- Superadministración: negocios, registro con RFC y límite de sucursales, suspensión/reactivación y renovación de licencias según el servidor.
- Agenda/citas, clientes, reportes, WhatsApp, datos generales del negocio, especialidad, descripción de servicios y modos libre/compacto muestran **Aún no forma parte de esta entrega** en la versión conectada. Permanecen disponibles en la demo. El acceso al portal desde el panel sigue pendiente; su entrada directa `/reservas/:slug` permite consultar oferta, apartar, enviar y recuperar el resultado propio de una reserva pendiente.
- El selector del espacio permite cerrar sesión. El token se guarda solo en la sesión de esta pestaña; los errores de la API se muestran en los formularios.
- La carpeta del backend se conserva como fuente de consulta: esta integración solo modifica el frontend.

### Entrada pública conectada: T098–T116

En el panel, administración dispone de **Mi cuenta → Tu portal de reservas → Abrir portal / Copiar enlace**. Requiere el backend actualizado con `identificadorPublico` en login/perfil; al recargar se obtiene el dato con la sesión vigente. Si falta un identificador válido, se informa y se deshabilitan las acciones. [Contrato, pruebas y evidencia del acceso](docs/fase-4/resultados-tareas/resultado-acceso-portal-perfil.md).

T115 añade avisos accesibles en una región estable, restauración de foco visible y ajustes móviles. T116 amplía las pruebas de invalidación, respuestas fuera de orden, contacto en memoria e incertidumbre. Detalle y evidencia: [T115–T116](docs/fase-4/resultados-tareas/resultado-t115-t116.md). El runner T117 sigue fuera de este alcance.

El cliente público llama exclusivamente a `/publico/negocios/:slug/...` bajo el mismo origen del frontend, con cookie HttpOnly y protección CSRF. No usa el JWT del panel ni llama directamente a `VITE_API_URL`. En desarrollo, `vite.config.js` dirige `/publico` hacia `VITE_API_URL` (por defecto `http://localhost:3000`) sin cambiar el encabezado Origin ni la ruta de la cookie.

La API debe tener configurados `PORTAL_PUBLICO_ORIGEN` con el origen exacto de Vite y `PORTAL_CSRF_SECRET` con un secreto de servidor válido. Esta entrega no modifica esas variables en el backend; nunca deben trasladarse a variables `VITE_*`. Se necesitan HTTPS o localhost, Web Locks, BroadcastChannel y cookies habilitadas. Una dirección HTTP de red local puede no ofrecer las APIs de contexto seguro.

El proxy anterior es solo de desarrollo: `dist/` y `npm run preview` requieren un proxy de mismo origen externo para una sesión conectada. La configuración de Nginx sigue pendiente de acordar dominio, HTTPS y ubicación de la API. Evidencia y límites: [resultado T098–T100](docs/fase-4/resultados-tareas/resultado-t098-t100.md) y [resultado T101–T103](docs/fase-4/resultados-tareas/resultado-t101-t103.md).

La selección invalida las opciones posteriores cuando cambia un dato y descarta respuestas antiguas. El selector de fecha consulta un día por petición, sin imponer un horizonte diferente del servidor, y muestra las horas en la zona IANA devuelta por la API. Una consulta fallida ofrece reintento y no se presenta como agenda vacía. Elegir un horario aún no lo aparta.

**Apartar este horario** solicita una concesión al servidor con una clave estable para sus reintentos. Solo abre contacto después de verificar el apartado propio. El contador usa la hora y vencimiento del servidor y no se amplía por actividad. Las pestañas se avisan con BroadcastChannel y consultan la vigencia al reenfocar. Volver confirma la liberación del ID/generación propios; salir o recargar intenta liberarlo con `fetch` y `keepalive`. La salida no garantiza entrega y sigue aplicando el vencimiento del servidor.

Nombre, teléfono y notas se conservan únicamente en memoria durante la navegación interna. **Revisar datos** valida localmente. **Reservar** confirma primero en sessionStorage un marcador con solo negocio, apartado y clave de intento, prepara ese intento y envía el contacto normalizado. Un reintento conserva clave y contenido; ante incertidumbre no se inicia otra reserva ni se libera el apartado al salir.

Una recarga con marcador consulta el resolutor antes de cargar catálogos: muestra el resultado guardado o reinicia solo después de una ausencia terminal comprobada. Sin marcador, la recarga reinicia y no restaura el formulario. El resumen usa folio, nombres, fecha/hora/zona y costo guardados, siempre con estado pendiente. Evidencia: [T104–T109](docs/fase-4/resultados-tareas/resultado-t104-t109.md) y [T110–T114](docs/fase-4/resultados-tareas/resultado-t110-t114.md).

Límite actual del backend: obtener CSRF al recargar depende de la inicialización pública, que exige licencia para nuevas reservas. Si la licencia impide esa inicialización, se conserva el marcador y se informa de recuperación pendiente; el frontend no puede recuperar por sí solo el resultado en ese escenario. El ajuste necesario de la sesión existente se describe en el resultado T110–T114 y no se implementó en el backend. Las pruebas de este lote utilizan API ficticia/dobles, sin validar una base real.

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
  main.js              # Delega al selector de entradas
  entry-router.js      # Separa portal público, panel conectado y demo explícita
  demo/                # Datos ficticios, reservas y horarios en memoria
    entry.js
    data.js
    availability.js
    schedule.js
    screens/
      index.js        # Registro de pantallas de la demo
      resumen/         # view.js y style.css
      clientes/        # view.js, actions.js y style.css
      reportes/        # view.js, state.js y style.css
      notificaciones/  # view.js y style.css
      configuracion/   # view.js y style.css
      reservas/        # booking.js y style.css
  connected/           # Integración con el backend
    entry.js
    public/            # Entrada pública aislada, HTTP y coordinación del navegador
    backend.js         # Fachada para las vistas comunes
    mode.js
    screens/index.js   # Registro de pantallas conectadas
    modules/
      auth/             # Sesión y cliente HTTP
      catalogos/        # Datos de servicios y sucursales
      datos/            # Carga real según el rol
      disponibilidad/   # Horarios enviados a la API
      permisos/         # Pantallas disponibles según el rol
  shared/              # Router, estado, UI y estilos generales
    app.js
    actions.js         # Distribuye eventos a acciones por pantalla
    forms.js           # Formularios comunes
    styles.css         # Shell y componentes comunes
    screens/
      agenda/          # view.js, table.js, actions.js y CSS
      profesionales/   # view.js y style.css
      servicios/       # view.js y style.css
      sucursales/      # view.js y style.css
      disponibilidad/  # view.js, actions.js y style.css
      plataforma/      # view.js y actions.js
      catalogos/       # Acciones comunes de los tres catálogos
public/data/demo.json # Catálogos ficticios de dos negocios
db/schema.sql        # Propuesta SQL para una base NUEVA, no ejecutada por la app
docs/                # Diccionario, alcance y contrato futuro de seguridad
tests/               # Verificaciones del motor en memoria
```

## Estilo de cristal

La clase reutilizable `.glass-effect` está en `src/shared/styles.css` y usa blanco al 20 %, desenfoque de 7 px, borde blanco al 30 % y sombra de 30 px. Se aplica a los diálogos y avisos del prototipo. El exterior del diálogo permanece nítido y transparente; el modo oscuro adapta el vidrio y el texto. El selector de negocio y el resumen del portal usan variantes adecuadas a sus fondos.

## Configuración


Copia `.env.example` a `.env` si deseas cambiar el nombre, fecha de referencia o URL de la API. Las variables `VITE_*` son públicas: **nunca deben contener secretos**. Los cambios requieren reiniciar Vite. El frontend usa la API configurada; ninguna credencial está incluida en el repositorio.

## Modelo SQL de referencia

El script `db/schema.sql` propone una base separada, `citas_saas_prototipo`, y conserva la terminología del esquema proporcionado. **No se ejecutó contra MySQL/MariaDB**. Se instala en una base vacía con un cliente SQL y un usuario autorizado. No es una migración del proyecto existente ni una base conectada a estas pantallas.

Las claves foráneas compuestas impiden relaciones cruzadas entre negocios. Se agregan configuración de agenda, licencias, vinculación de profesionales y usuarios, pertenencia de las tablas puente, precio acordado y fila de exclusión por profesional/día. La futura API todavía debe implementar la autorización y las transacciones descritas en `docs/arquitectura-seguridad.md`.

Bootstrap se distribuye por npm; tipografías DM Sans y Manrope se cargan de Google Fonts y tienen respaldo local `sans-serif`. Las sucursales incluyen diagramas decorativos, no mapas geográficos reales.
