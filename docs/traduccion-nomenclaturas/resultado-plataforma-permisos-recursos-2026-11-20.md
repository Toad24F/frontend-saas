# Traducción de Plataforma, permisos y recursos inhabilitados

Fecha: 2026-11-20

## Alcance

La sección 12 del plan unifica nombres de archivos, funciones, estado del directorio, clases y atributos `data-*` del frontend. Se actualizaron los consumidores en los índices conectado y demo, la navegación y las acciones compartidas, Configuración de demo y los cuatro catálogos conectados. Los estilos mantienen sus declaraciones, dimensiones y colores en ambos temas.

| Ubicación | Archivo anterior → actual |
| --- | --- |
| `src/shared/screens/plataforma/` | `view.js` → `plataforma.vista.js`, `actions.js` → `plataforma.acciones.js`, `directory.js` → `plataforma.directorio.js`, `directory-model.js` → `plataforma.modelo-directorio.js`, `style.css` → `plataforma.estilos.css` |
| `src/connected/modules/permisos/` | `pages.js` → `permisos.paginas.js`, `roles.js` → `permisos.roles.js` |
| `src/connected/modules/recursos/` | `affected.js` → `recursos.afectaciones.js`, `retired.js` → `recursos.inhabilitados.js` |
| `src/connected/screens/recursos/` | `retired-view.js` → `inhabilitados.vista.js`, `retired-view.css` → `inhabilitados.estilos.css` |
| `tests/` | `platform-directory.test.js` → `plataforma.directorio.test.js`, `browser-platform.mjs` → `plataforma.directorio-navegador.mjs`, `ala-inhabilitados.test.js` → `recursos.inhabilitados.test.js` |
| `tests/navegador/` | `retired-resources.spec.js` → `recursos.inhabilitados.spec.js` |

También se actualizaron `tests/agenda.consulta-conectada.test.js`, `tests/conexion.backend.test.js` y `tests/administracion.revision-navegador.mjs`. El [glosario](glosario-nomenclatura-frontend.md#equivalencias-de-plataforma-permisos-y-recursos-inhabilitados) recoge los nombres de funciones, estado y filtros.

## Contratos

- Se cotejaron los controladores de Negocios, Profesionales, Recepcionistas, Servicios, Sucursales y Disponibilidad. Plataforma y el detalle de negocio conectado mantienen acceso exclusivo de `superadmin`. El acceso del frontend a inhabilitados sigue disponible para `admin_negocio` en los cuatro catálogos.
- Se conservaron las rutas de la SPA, los cuatro roles de sesión, los cuerpos de alta y restauración, y los campos y valores de respuesta. La restauración exige `activo: false` e `inhabilitadoEn: null`. La consulta de citas afectadas sigue usando GET con `desde`, `hasta` y los filtros admitidos por el servidor.
- El directorio consume el modelo compartido de negocios de `db.tenants`. Se conservan sus propiedades y las interfaces de datos, sesión y componentes compartidos previstas para otros conjuntos del plan. Los nombres del formulario y los filtros traducidos solo viven en la interfaz.

## Verificación

- `npm test` pasó con 297 pruebas. Las 27 pruebas específicas pasaron también por separado. Cubren visibilidad por rol, estados activo/inactivo/inhabilitado, restauración de los cuatro recursos, filtros de seguimiento y lectura de afectaciones.
- `npm run build` y `git diff --check` pasaron. La búsqueda en `src/` y `tests/` verificó la sustitución de imports y selectores anteriores. Se cotejaron las declaraciones CSS y las reglas responsivas con la versión previa.
- Con Edge y API simulada pasaron los recorridos `node tests/plataforma.directorio-navegador.mjs` y `node tests/administracion.revision-navegador.mjs`. Se comprobó el cuerpo del alta conectada, búsqueda, filtros, paginación, ida y vuelta al detalle, actualización, error y vacío. La demo cubrió suspensión, renovación, alta y cambio de negocio. En inhabilitados se comprobó búsqueda, detalle, restauración a inactivo, error y reintento.
- Se ejecutaron 24 casos Playwright de Agenda, Cuenta, Disponibilidad y sesión con la configuración `tests/m4-navegador.config.js`. Pasaron 23 en la corrida conjunta. La comparación visual de Agenda difirió en 0,032 px al comparar el ancho exacto de una columna y pasó al repetirse de forma aislada. La suite también verificó navegación y acceso directo con los cuatro roles.
- Los recorridos comprobaron los anchos de 1366, 1159, 390 y 320 px para el modo conectado y 1366 y 390 px para la demo. Se generaron capturas en ambos temas y se revisaron ejemplos de escritorio y móvil de Plataforma e Inhabilitados.
- Playwright detectó cinco pruebas de recursos inhabilitados del runner con MariaDB. Su ejecución requiere preparar y escribir en una base efímera. Las verificaciones de esta entrega usaron API simulada y no alteraron el backend ni su base de datos.
