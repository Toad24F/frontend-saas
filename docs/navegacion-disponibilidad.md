# Navegación agrupada de Disponibilidad

## Qué cambió y por qué

Disponibilidad ahora se despliega en el menú lateral como **Equipo**, **Reglas del negocio** y **Comprobar**. Cada grupo tiene una ruta propia (`/admin/disponibilidad/equipo`, `/negocio` o `/comprobar`) y presenta solo sus opciones relacionadas. Esto separa la configuración del personal, las reglas generales y las consultas de verificación sin alterar los formularios ni sus validaciones.

El submenú participa en el flujo normal de la barra lateral: al abrirlo desplaza Análisis, Reportes y el contenido posterior hacia abajo. La barra lateral conserva desplazamiento vertical en escritorio y en el cajón móvil cuando supera la altura disponible. El control expone su estado con `aria-expanded`, los destinos marcan `aria-current` y se conserva la navegación inferior móvil.

## Alcance

- **Conectado:** el administrador ve los tres grupos; el profesional ve Equipo y Comprobar; recepción ve Comprobar. Se conservan los permisos y las llamadas existentes. Oferta por sucursal permanece dentro de Equipo. No se cambió el backend.
- **Demo:** muestra los tres destinos y sus datos ficticios. La demo no tiene una pestaña de Oferta por sucursal; su Equipo reúne sucursales, horario y bloqueos.
- **Temas y tamaños:** estilos para claro y oscuro en la barra lateral existente. El mismo menú se utiliza en escritorio y en el cajón de móvil.
- **Rutas anteriores:** abrir `/admin/disponibilidad` dirige al primer grupo permitido; una ruta de grupo no autorizada también se reconduce a ese grupo.

## Archivos afectados

`src/shared/app.js`, `src/shared/screens/disponibilidad/{groups.js,view.js}`, `src/shared/{styles.css,theme.css}` y `tests/disponibilidad-grupos.test.js`.

## Comprobación y límites

`npm test`: 66 pruebas correctas. `npm run build`: correcto. `git diff --check`: sin errores. En el navegador se comprobó la demo en escritorio oscuro y claro: apertura y cierre del submenú, desplazamiento de Análisis y Reportes, scroll de la barra lateral, contenido de los tres grupos y retorno del navegador. El diseño móvil se revisó en CSS; la herramienta de navegador disponible en esta sesión no permitió cambiar el ancho de la ventana para una verificación visual móvil. La vista conectada estaba en la pantalla de acceso y no se probó visualmente sin credenciales.
