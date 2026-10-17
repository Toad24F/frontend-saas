# Instrucciones para agentes — Citalendar frontend

## Alcance y prioridades

- Trabaja en este repositorio de frontend. La carpeta hermana `../backend` es **solo de lectura**: se puede consultar para entender rutas, DTO, roles y respuestas, pero no editar archivos, configuraciones, datos, migraciones ni ejecutar cambios sobre su base de datos. Si una solución requiere cambiarlo, explica qué falta y propón el contrato necesario.
- Conserva la funcionalidad, permisos, validaciones, mensajes y flujos existentes. No presentes una capacidad de la demo como si ya estuviera conectada al backend. El backend funciona con varias pantallas, pero sigue incompleto; comprueba cada ruta antes de afirmar que una función real está disponible.
- Las peticiones actuales del usuario tienen prioridad sobre esta guía. Si hay dos interpretaciones que cambian datos, permisos, alcance o diseño de manera importante, indica la ambigüedad y haz una pregunta concreta. Avanza en lo que no dependa de la respuesta. No inventes contratos ni comportamientos del backend.
- Mantén el diseño actual como referencia: marca Citalendar, tipografías, espaciado, jerarquía, componentes y paleta. El modo claro usa superficies neutras y acento terracota; el oscuro usa grafito y terracota, sin fondos verdes. Conserva el contraste y los colores semánticos de estados. Cambia colores o dirección visual solo si el usuario lo pide expresamente.

## Stack y arquitectura

- Usa **HTML, CSS y JavaScript vanilla con módulos ES**. Bootstrap 5 ya es una dependencia del proyecto; úsalo sin reemplazar la arquitectura. No introduzcas React, Vue, Angular, TypeScript, Tailwind, un router externo, CSS-in-JS ni bibliotecas nuevas para resolver tareas que admite el stack actual. Si una dependencia nueva fuera indispensable, justifica su costo y pide la decisión cuando afecte la arquitectura.
- `src/main.js` elige `src/connected/` o `src/demo/` mediante `?demo=1`. La UI, el enrutado y los estilos comunes viven en `src/shared/`. Reutiliza esa separación y limita los cambios a las pantallas solicitadas.
- Vite (`npm run dev`) se usa para desarrollo y depuración; `npm run build` genera `dist/` y `npm run preview` permite revisar esa salida. **Nginx es el servidor previsto para publicar el frontend**, no sustituye a Vite durante el desarrollo. No hay configuración de Nginx en este repositorio: antes de implementarla, acuerda dominio, HTTPS, ubicación de la API y proxy. Al servir la SPA, las rutas de frontend deben volver a `index.html`; no redirijas rutas de API sin conocer el despliegue.
- Las variables `VITE_*` quedan expuestas en el navegador. No coloques secretos, tokens ni contraseñas en el código, la demo, `.env.example` o la documentación.

## Demo, backend e interfaz

- La versión conectada es el producto real. La demo usa datos ficticios como referencia visual y funcional. Cuando se cambia un componente compartido, verifica ambos modos; cuando cambie una pantalla conectada, actualiza la demo correspondiente si existe para que siga representando la interfaz. Mantén explícitas las diferencias de capacidades y datos.
- Consulta el código y la documentación del backend antes de ajustar integración, roles, campos o errores. No ocultes fallos reales detrás de datos ficticios. Preserva el aislamiento por negocio y el acceso permitido por rol.
- Postman CLI está instalado para trabajo de API. En este proyecto úsalo, si hace falta, solo para inspección o consultas de lectura autorizadas; su disponibilidad no concede permiso para alterar el backend ni datos reales.
- Conserva los logos de `public/brand` y el recurso adecuado para cada tema. Mantén la navegación inferior móvil y su acceso a las secciones. En los catálogos, el selector lista/tarjetas se comparte en escritorio; en móvil se muestran tarjetas y no se ofrece ese selector. Verifica que menús, diálogos y acciones no queden tapados por la barra móvil.
- Revisa estados de carga, vacío, error, activo, inactivo, hover y foco. Evita desbordamientos y superposiciones al reducir el ancho. Mantén etiquetas y navegación por teclado, contraste legible y tamaños táctiles cómodos.

## Skills de diseño instaladas

Las skills están en `.agents/skills/`. Lee el `SKILL.md` de la que corresponda antes de aplicarla. Son herramientas situacionales; sus preferencias estéticas generales **no autorizan** cambiar la marca, los colores, la navegación ni el stack de este proyecto.

| Skill | Cuándo usarla aquí |
| --- | --- |
| `redesign-existing-projects` | Al auditar o mejorar una pantalla existente. Primero examina la implementación y sus estados; después haz cambios acotados y comprueba que la función siga intacta. |
| `design-taste-frontend` | Para una dirección visual de login, portal público o una página nueva. Su propio alcance excluye dashboards y flujos de producto densos; no impongas sus patrones de landing en los catálogos o la agenda. |
| `high-end-visual-design` | Como fuente puntual de criterios de detalle, ritmo o movimiento cuando el usuario pida refinamiento visual. Adapta sus propuestas al diseño actual; no apliques sus prohibiciones de fuentes, bordes o layouts literalmente. |
| `minimalist-ui` | Si se pide simplificar una vista densa. Toma principios de claridad, jerarquía y espaciado, sin reemplazar la paleta ni eliminar controles necesarios. |
| `imagegen-frontend-web` | Para referencias **en imagen** de pantallas web antes de implementarlas, cuando el usuario pida una propuesta visual. No produce código ni demuestra que la interfaz funcione. |
| `imagegen-frontend-mobile` | Para referencias **en imagen** de vistas de teléfono. No produce código; la implementación debe respetar la navegación móvil real. |
| `image-to-code` | Solo si el usuario pide explícitamente implementar una referencia visual nueva mediante ese proceso. Ajusta el resultado al HTML/CSS/JS existente. |
| `brandkit` o `stitch-design-taste` | Solo si se pide trabajar la identidad visual o un `DESIGN.md` para Stitch. No sustituyen automáticamente la marca vigente. |

`gpt-taste` e `industrial-brutalist-ui` proponen lenguajes visuales ajenos al panel actual; úsalas solo ante una petición explícita de esa dirección. `design-taste-frontend-v1` se reserva para compatibilidad con trabajos que pidan esa versión. `full-output-enforcement` sirve cuando se solicite una entrega íntegra y extensa, no para decidir estilos.

## Ejecución y documentación

1. Lee la pantalla afectada, sus estilos, el flujo conectado, la demo y las instrucciones locales pertinentes. Identifica qué comportamiento debe permanecer igual.
2. Implementa el cambio más pequeño que cubra la petición. Evita refactorizaciones no relacionadas y respeta cambios sin confirmar que ya estén en el árbol de trabajo.
3. Para cada cambio funcional, visual o de integración relevante, crea o actualiza una nota en `docs/`: **qué cambió, por qué, alcance (conectado/demo, temas y tamaños), archivos afectados, cómo se comprobó y límites o pendientes**. Corrige documentación anterior si quedó desactualizada. No documentes como implementado algo que solo es propuesta.
4. Ejecuta las comprobaciones proporcionales al riesgo: `git diff --check`, `npm test` si afecta comportamiento y `npm run build` si afecta la salida. Para UI, revisa visualmente escritorio y móvil en ambos temas y el modo conectado/demo que corresponda. Registra resultados reales y no afirmes verificaciones no hechas.
5. Resume al usuario el cambio, su motivo, la verificación y cualquier dependencia pendiente del backend o de Nginx.

Consulta `README.md` para ejecutar el proyecto y `docs/` para contratos, auditorías y verificaciones. Si difieren del código actual, verifica en el código y actualiza la documentación relevante.
