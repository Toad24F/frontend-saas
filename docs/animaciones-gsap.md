# Sistema de animación con GSAP

## Qué cambió y por qué

Se sustituyeron las animaciones CSS dispersas por un motor compartido basado en GSAP. El objetivo es dar continuidad visual a toda la aplicación sin cambiar su arquitectura, sus flujos ni la marca Citalendar.

El motor cubre:

- entrada del shell y transición entre rutas;
- revelado escalonado de encabezados, paneles, tarjetas y estados vacíos;
- aparición progresiva al desplazarse mediante `ScrollTrigger`;
- respuesta física de hover y pulsación en controles interactivos;
- apertura de menús, diálogos y avisos;
- transición al cambiar entre tema claro y oscuro;
- cambios de paso del portal público de reservas.

No se aplicó pinning a formularios, tablas o catálogos porque alteraría el desplazamiento operativo y podría superponerse con la navegación inferior móvil. La idea de apilamiento de `gpt-taste` se adaptó a entradas escalonadas y revelados por scroll que no modifican la geometría del contenido.

## Alcance

- Modo conectado y demo: usan el motor compartido desde `src/shared/`.
- Portal público demo: anima cada cambio de paso sin representar capacidades nuevas del backend.
- Tema claro y oscuro: conserva la paleta y los contrastes existentes.
- Escritorio y móvil: conserva los breakpoints, el drawer y la barra inferior existentes.
- Accesibilidad: `prefers-reduced-motion: reduce` desactiva GSAP y minimiza transiciones CSS; foco, teclado, etiquetas y estados `disabled` no cambian.

## Archivos afectados

- `package.json` y `package-lock.json`: dependencia `gsap`.
- `src/shared/motion.js`: motor, `ScrollTrigger` y microinteracciones delegadas.
- `src/shared/motion.css`: transiciones de color/superficie, sombras y fallback de movimiento reducido.
- `src/shared/app.js`: integración con rutas, menús y cambio de tema.
- `src/shared/ui.js`: integración de diálogos y avisos.
- `src/demo/screens/reservas/booking.js`: transición GSAP entre pasos.

## Comprobación

- `npm test`: 70 pruebas aprobadas.
- `npm run build`: compilación Vite aprobada.
- `git diff --check`: aprobado.
- Se comprobó que el módulo se pueda importar en las pruebas de Node sin depender de `window`, `document` o `matchMedia`.

La revisión visual automatizada no se pudo completar: el navegador aislado de Codex no tuvo acceso al servidor Vite en `localhost` ni a su dirección de red local. No se registra como realizada una revisión visual de escritorio/móvil o claro/oscuro.

## Límites y pendientes

- No se cambió el backend ni se añadió ningún contrato de API.
- No se cambió el stack: continúa HTML, CSS y JavaScript vanilla con módulos ES y Bootstrap; GSAP es una dependencia de animación, no un framework de interfaz.
- Conviene hacer una pasada manual final en navegador sobre demo y conectado, en escritorio/móvil y ambos temas, con especial atención a listas largas, menús y diálogos.
