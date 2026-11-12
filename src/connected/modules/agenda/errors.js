// Solo mensajes propios: una respuesta HTTP nunca imprime SQL, trazas ni contacto del servidor en la interfaz.
export function privateError(error) {
  const status = error?.status;
  const entries = {
    400: [
      'invalid',
      'Entrada inválida',
      'Revisa los campos o acota el periodo y los filtros antes de volver a consultar.',
      false,
    ],
    401: [
      'session',
      'Sesión no disponible',
      'Tu sesión o licencia ya no permite consultar estos datos. Inicia sesión nuevamente.',
      false,
    ],
    403: [
      'forbidden',
      'Acceso no permitido',
      'Tu cuenta no tiene permiso para realizar esta acción.',
      false,
    ],
    404: [
      'missing',
      'Recurso no disponible',
      'El recurso no existe o no está disponible para tu cuenta.',
      false,
    ],
    409: [
      'conflict',
      'Conflicto',
      'Hay un conflicto: los datos o las condiciones cambiaron. Relee la información vigente antes de guardar.',
      false,
    ],
    0: [
      'network',
      'Sin conexión',
      'No se pudo conectar con el servidor. Comprueba la conexión y reintenta la consulta.',
      true,
    ],
  };
  const [kind, title, message, retry] = entries[status] || [
    'technical',
    'Fallo técnico',
    'No se pudo comprobar la información. Reintenta la consulta en unos momentos.',
    true,
  ];
  return {
    kind,
    title,
    message:
      status === 400 && /1[.,]000/.test(error?.message)
        ? 'La consulta supera 1.000 citas. Acota el periodo o los filtros.'
        : message,
    retry,
  };
}
