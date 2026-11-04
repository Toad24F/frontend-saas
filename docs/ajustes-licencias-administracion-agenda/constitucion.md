# Constitución — Ajustes de licencias, administración y agenda (frontend)

Estado: propuesta para revisión; guía la adaptación del frontend a contratos verificados del backend.
1. Conservar Citalendar, HTML, CSS, JavaScript ES, Bootstrap y la separación entre conectado, demo y componentes compartidos.
2. Tratar `../backend` como solo lectura; integrar únicamente rutas, campos, permisos y respuestas comprobados en su código.
3. Derivar identidad y negocio de la sesión; no aceptar datos del navegador como autoridad para precios, roles, cupos o reservas.
4. Adaptar licencias a plazo configurable e `Idempotency-Key` estable por operación y reintento, sin duplicar efectos.
5. Mostrar cupos de profesionales y recepcionistas según el rol y explicar sus límites antes de crear o reactivar.
6. Sustituir borrados retirados por inhabilitación recuperable; distinguir activo, inactivo e inhabilitado y restaurar como inactivo.
7. Permitir administrar la publicación de precios y omitir importes públicos cuando el backend los oculte, incluso en apartados y resultados.
8. Representar tiempo entre citas y sus reglas reales; retirar descansos incrustados y excepciones por fecha, conservando franjas y bloqueos.
9. Mantener disponibilidad, apartado y reserva como estados distintos; nunca presentar una consulta como reserva garantizada.
10. Resolver rechazos e incertidumbre del portal con el intento propio; ofrecer corrección por cupo solo cuando el servidor la autorice.
11. Preservar permisos, accesibilidad, temas, navegación móvil, validaciones y mensajes; actualizar la demo sin fingir conexión.
12. Documentar alcance y límites, probar contratos y flujos afectados, y verificar escritorio y móvil antes de declarar integración completa.
