# Resultado de traducción — Profesionales

Fecha de cierre: 2026-11-17  
Estado: terminado

## Qué cambió y por qué

Se aplicó a Profesionales la convención `dominio.responsabilidad.extensión` y se tradujo la nomenclatura propia del frontend sin cambiar el comportamiento del catálogo ni sus permisos.

Los archivos principales quedaron así:

```text
src/shared/screens/profesionales/
  profesionales.vista.js
  profesionales.errores.js
  profesionales.estilos.css

src/connected/screens/profesionales/
  profesionales.vista.js
  profesionales.acciones.js
  profesionales.estilos.css

src/connected/modules/profesionales/
  profesionales.operaciones.js
```

Se tradujeron funciones como `profesionales`, `validarProfesional`, `interpretarErrorProfesional`, `aplicarFiltrosProfesionales`, `accionProfesional` y `ejecutarAccionProfesional`. También se actualizaron variables, atributos `data-*`, identificadores y acciones internas como `nuevo-profesional`, `data-profesional-id`, `data-accion-profesional` y `data-vista-profesionales`.

## Estilos compartidos

La hoja compartida de Profesionales define la estructura visual usada también por Servicios, Sucursales y Recepcionistas. Por ello se tradujeron coordinadamente sus selectores y todos los consumidores necesarios. Entre los cambios están:

- `professional-workspace` → `profesionales-espacio`.
- `professional-entry` → `profesional-entrada`.
- `professional-view--list` → `profesionales-vista--lista`.
- `professional-view--cards` → `profesionales-vista--tarjetas`.
- `professional-more` → `profesional-mas`.
- `professional-more-menu` → `profesional-menu-mas`.

Este ajuste no modificó colores, distribución, comportamiento responsivo ni identidad visual.

## Alcance comprobado

- Modo conectado y modo demo.
- Roles de administración y profesional.
- Alta y edición, incluidos nombre, especialidad, correo y contraseña.
- Asignaciones de servicios y sucursales de la demo.
- Estados activo, inactivo e inhabilitado.
- Reactivación con consulta de cupo y permisos del negocio.
- Búsqueda, filtros combinados, limpieza y paginación local.
- Vista de lista y tarjetas.
- Estados vacío, sin coincidencias y error.
- Escritorio de 1366 px y móvil de 390 px en tema claro y oscuro; la prueba conectada también recorrió 1159 px y 320 px.
- Servicios, Sucursales y Recepcionistas después de traducir los estilos compartidos.

## Contratos conservados

No se cambiaron las rutas `/profesionales`, `/profesionales/:id`, `/profesionales/:id/desactivar`, `/profesionales/:id/reactivar`, `/profesionales/:id/inhabilitar`, las rutas de cupo ni los métodos HTTP.

Permanecieron intactos los campos del backend y del modelo normalizado, entre ellos `nombre`, `correo`, `especialidad`, `password`, `professionals`, `professionalId`, `name`, `specialty`, `email`, `active`, `serviceIds` y `branchIds`. También se conservaron temporalmente valores compartidos como `search`, `status`, `branch`, `service`, `all`, `active`, `inactive`, `list`, `cards` y `data-desktop-view`; traducirlos corresponde a los conjuntos de catálogos o núcleo compartido.

El contenedor de resultados usa `profesional-results`: el dominio quedó en español y el sufijo `results` todavía lo construye el paginador común. Se resolverá coordinadamente en el conjunto 6 para evitar romper parcialmente los demás catálogos.

## Consumidores actualizados

- Índices de pantallas conectada y demo.
- Eventos y acciones globales.
- Formularios compartidos de catálogos.
- Validación reutilizada por Servicios, Sucursales y Recepcionistas.
- Vista y estilos de Servicios, Sucursales y Recepcionistas que consumen la estructura compartida.
- Vista de recursos inhabilitados y pruebas relacionadas.

## Verificación realizada

- `node --check`: correcto en todos los JavaScript modificados.
- Pruebas dirigidas: 20 aprobadas, 0 fallidas.
- `npm test`: 295 aprobadas, 0 fallidas.
- `tests/browser-local-pagination.mjs`: aprobada con API simulada.
- `tests/browser-admin-review.mjs`: aprobada con API simulada; conectado/demo, escritorio/móvil y ambos temas.
- `npm run build`: correcto; Vite transformó 190 módulos.
- Búsqueda con `rg`: sin imports, funciones, acciones ni selectores anteriores del conjunto.
- `git diff --check`: correcto.

Las pruebas de navegador realizaron solamente escrituras simuladas en memoria. No se ejecutó `npm run test:browser`, porque esa suite prepara una base efímera del backend y el alcance del frontend no autoriza ejecutar cambios sobre su base de datos.

## Límites y pendientes

No se tradujeron contratos del backend, claves del modelo compartido ni utilidades generales de catálogos. El siguiente conjunto previsto es Recepcionistas. No hubo cambios en el backend ni en su configuración.
