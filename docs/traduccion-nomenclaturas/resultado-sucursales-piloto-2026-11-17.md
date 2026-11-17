# Resultado del piloto de nomenclatura — Sucursales

La actualización posterior de filtros, vista y paginación compartida se documenta en [Catálogos compartidos](resultado-catalogos-compartidos-2026-11-17.md).

Fecha: 2026-11-17  
Estado: implementado y verificado

## Qué cambió y por qué

El conjunto de Sucursales se migró primero para validar la convención `dominio.responsabilidad.extensión` antes de aplicarla a módulos más grandes. Se tradujeron los nombres propios del módulo sin cambiar comportamiento, diseño, permisos ni contratos del backend.

Los archivos quedaron organizados así:

```text
src/shared/screens/sucursales/
  sucursales.vista.js
  sucursales.errores.js
  sucursales.zonas-horarias.js
  sucursales.estilos.css

src/connected/screens/sucursales/
  sucursales.vista.js
  sucursales.acciones.js

src/connected/modules/sucursales/
  sucursales.operaciones.js
  sucursales.cupo.js
```

También se tradujeron funciones, variables, constantes y selectores propios. Algunos ejemplos son `sucursales`, `renderSucursal`, `aplicarFiltrosSucursales`, `validarSucursal`, `inhabilitarSucursal`, `obtenerCupoSucursales`, `ZONAS_HORARIAS_MEXICO`, `.sucursales-espacio` y `data-inhabilitar-sucursal`.

## Alcance

- Pantalla compartida por modo conectado y demo.
- Vista de Administración del negocio y vista permitida al Profesional.
- Alta, edición, activación, desactivación, inhabilitación, filtros, cambio lista/tarjetas, cupo y paginación.
- Escritorio y móvil.
- Temas claro y oscuro.
- Pruebas unitarias y pruebas de navegador con API simulada.

## Contratos conservados

No se modificaron rutas ni campos del backend. Permanecen, entre otros, `/sucursales`, `/sucursales/cupo`, `/sucursales/:id/inhabilitar`, `limiteSucursalesActivas`, `sucursalesActivas`, `disponibles`, `sucursalId`, `zonaHoraria`, `urlGoogleMaps` y `notasLlegada`.

También se conservaron temporalmente interfaces compartidas cuya traducción corresponde a etapas posteriores:

- La tabla interna `branches` y propiedades normalizadas como `name`, `address`, `phone`, `notes`, `maps`, `active` y `branchIds`; las consumen Agenda, Disponibilidad, Reservas, Reportes y el núcleo de datos.
- Las propiedades `search` y `status` y los valores `all`, `active` e `inactive`; son el contrato actual del encabezado de catálogos compartido.
- Los valores persistidos `list` y `cards`.
- El identificador parcial `sucursal-results`, porque `catalog-pagination.js` todavía impone el sufijo compartido `-results`.
- Clases genéricas compartidas como `professional-*`, `catalog-*`, `btn` y `form-*`; se migrarán con sus conjuntos propietarios o permanecen por Bootstrap.

La revisión de navegador detectó que traducir anticipadamente `search/status` dejaba habilitado el botón para limpiar filtros al iniciar. Se corrigió conservando ese contrato hasta la etapa **Catálogos compartidos**. Este hallazgo confirma que las propiedades compartidas deben migrarse con su componente propietario y no con un módulo consumidor aislado.

## Archivos consumidores actualizados

- Entradas de pantallas conectada y demo.
- Carga conectada de datos y cupo.
- Acciones y eventos compartidos.
- Formulario compartido de catálogos.
- Ajuste CSS del encabezado de Profesionales que consume el cupo de Sucursales.
- Pruebas unitarias, revisión administrativa, paginación local y recursos inhabilitados.
- `AGENTS.md`, para corregir la referencia después de la reorganización de los documentos de nomenclatura.

## Comprobaciones realizadas

- `node --check` sobre los archivos JavaScript modificados: correcto.
- Pruebas específicas de Sucursales y carga conectada: 15 de 15 correctas.
- `npm test`: 295 de 295 pruebas correctas.
- `npm run build`: correcto; 190 módulos transformados.
- `tests/browser-local-pagination.mjs`: correcto con API simulada; filtros, páginas 10/11/21, lista/tarjetas y móvil.
- `tests/browser-admin-review.mjs`: correcto con API simulada; Sucursales conectada y demo en 1366 y 390 px, temas claro y oscuro, sin desbordamiento.
- Búsqueda con `rg` de archivos, símbolos y selectores anteriores del conjunto: sin referencias residuales en `src/` ni `tests/`.
- `git diff --check`: se ejecuta como comprobación final del cambio.

No se ejecutó la suite Playwright configurada mediante `npm run test:browser`, porque su preparación crea y modifica una base de datos efímera desde el backend y las instrucciones de este repositorio limitan el backend a solo lectura. Las revisiones de navegador usadas en este piloto interceptan toda la API y no escriben en el backend.

## Convención confirmada

El piloto confirma estas decisiones para los módulos siguientes:

1. Traducir primero archivos y símbolos pertenecientes al módulo.
2. Actualizar en el mismo cambio todos los imports, selectores y pruebas consumidoras.
3. Conservar contratos externos y contratos internos compartidos hasta la etapa de su componente propietario.
4. Ejecutar pruebas unitarias, build y navegador antes de cerrar cada conjunto.

