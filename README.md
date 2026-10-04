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

El proyecto lee sus datos ficticios mediante `fetch('/data/demo.json')` y navega con History API, sin recargar las páginas. No requiere API, base de datos, credenciales ni cuenta de WhatsApp. El servidor que publique `dist/` debe resolver rutas desconocidas a `index.html` (fallback de SPA).

## Pantallas

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

## Recorrido sugerido

1. Abre una cita del calendario y cambia su estado.
2. Usa **Nueva cita** para probar agendamiento manual. El profesional cambia de sucursal según el día: en los ejemplos, Centro lunes/miércoles/viernes y Norte martes/jueves.
3. Abre **Portal de reservas** y completa Servicio → Sucursal → Profesional → Fecha/hora → Datos → Confirmación con nombre ficticio y teléfono inventado de 10 dígitos.
4. Verifica el folio y usa **Ver cita en el panel**. La cita aparece en el mismo estado en memoria.
5. En **Disponibilidad**, selecciona a la Dra. Ana Martínez y revisa las dos franjas del sábado, agrupadas por color: trabaja en Norte de 09:00 a 13:00 y en Centro de 14:00 a 18:00. Usa **+** para agregar otra franja. Prueba un empalme: el formulario señala el conflicto y conserva el horario guardado.
6. Abre el portal, elige Consulta general y a la Dra. Ana. El sábado 12 de septiembre de 2026 ofrece horas de la mañana en Norte y de la tarde en Centro.
7. Cambia de espacio de trabajo con el selector lateral para explorar Espacio Mente.
8. En **Reportes**, aplica un rango y usa **Guardar como PDF**; selecciona ese destino en la impresión del navegador.

## Alcance exacto

La última nota del usuario limita el trabajo a un **prototipo de pantallas**. El PDF y el SQL originales son material de referencia, no órdenes de conectar servicios reales.

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
  app.js             # Router, estado de pantalla, shell y calendario
  calendar-layout.js # Columnas para citas simultáneas
  data.js            # Carga Fetch, datos ficticios y selectores por negocio
  availability.js    # Slots, apartamientos y reserva en memoria
  views.js           # Pantallas administrativas y reportes
  actions.js         # Formularios, cambios de estado y catálogos
  booking.js         # Portal público y flujo de seis pasos
  ui.js              # Escape de texto, modales, estados y mensajes
  icons.js           # Iconos SVG de interfaz
  styles.css         # Estilos base e impresión
  theme.css          # Modo oscuro y adaptación móvil
public/data/demo.json # Catálogos ficticios de dos negocios
db/schema.sql        # Propuesta SQL para una base NUEVA, no ejecutada por la app
docs/                # Diccionario, alcance y contrato futuro de seguridad
tests/               # Verificaciones del motor en memoria
```

## Estilo de cristal

La clase reutilizable `.glass-effect` está en `src/styles.css` y usa blanco al 20 %, desenfoque de 7 px, borde blanco al 30 % y sombra de 30 px. Se aplica a los diálogos y avisos del prototipo. El exterior del diálogo permanece nítido y transparente; el modo oscuro adapta el vidrio y el texto. El selector de negocio y el resumen del portal usan variantes adecuadas a sus fondos.

## Configuración


Copia `.env.example` a `.env` si deseas cambiar el nombre o fecha de referencia. Las variables `VITE_*` son públicas: **nunca deben contener secretos**. Los cambios requieren reiniciar Vite. No se integró ninguna credencial ni se accedió al backend existente.

## Modelo SQL de referencia

El script `db/schema.sql` propone una base separada, `citas_saas_prototipo`, y conserva la terminología del esquema proporcionado. **No se ejecutó contra MySQL/MariaDB**. Se instala en una base vacía con un cliente SQL y un usuario autorizado. No es una migración del proyecto existente ni una base conectada a estas pantallas.

Las claves foráneas compuestas impiden relaciones cruzadas entre negocios. Se agregan configuración de agenda, licencias, vinculación de profesionales y usuarios, pertenencia de las tablas puente, precio acordado y fila de exclusión por profesional/día. La futura API todavía debe implementar la autorización y las transacciones descritas en `docs/arquitectura-seguridad.md`.

Bootstrap se distribuye por npm; tipografías DM Sans y Manrope se cargan de Google Fonts y tienen respaldo local `sans-serif`. Las sucursales incluyen diagramas decorativos, no mapas geográficos reales.
