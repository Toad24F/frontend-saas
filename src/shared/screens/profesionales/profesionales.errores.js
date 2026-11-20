const etiquetas = {
  name: 'Nombre completo', specialty: 'Especialidad', email: 'Correo',
  password: 'Contraseña', services: 'Servicios que ofrece', branches: 'Sucursales',
};

export function validarProfesional(datos, { propio = false, existente = false, demo = false } = {}) {
  const errores = {};
  if (!propio) {
    const nombre = String(datos.get('name') || '').trim();
    const especialidad = String(datos.get('specialty') || '').trim();
    const correo = String(datos.get('email') || '').trim();
    const password = String(datos.get('password') || '');
    if (!nombre) errores.name = 'Escribe el nombre completo.';
    else if (nombre.length > 150) errores.name = 'El nombre no puede superar 150 caracteres.';
    if (!especialidad) errores.specialty = 'Escribe la especialidad.';
    else if (especialidad.length > 150) errores.specialty = 'La especialidad no puede superar 150 caracteres.';
    if (!correo) errores.email = 'Escribe el correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (correo.length > 150) errores.email = 'El correo no puede superar 150 caracteres.';
    if (!demo && (!existente || password)) {
      if (!password) errores.password = 'Escribe una contraseña.';
      else if (password.length < 12) errores.password = 'Usa al menos 12 caracteres.';
      else if (new TextEncoder().encode(password).length > 72) errores.password = 'La contraseña no puede superar 72 bytes.';
    }
  }
  if (demo && !datos.getAll('services').length) errores.services = 'Selecciona al menos un servicio.';
  if (demo && !datos.getAll('branches').length) errores.branches = 'Selecciona al menos una sucursal.';
  return errores;
}

export function interpretarErrorProfesional(error) {
  if (error.field && etiquetas[error.field]) return { [error.field]: error.message };
  const mensaje = String(error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
  const coincidencias = [
    ['name', /nombre|name/i], ['specialty', /especialidad|specialty/i],
    ['email', /correo|email/i], ['password', /contraseñ|password/i],
    ['services', /servicio|service/i], ['branches', /sucursal|branch|franja/i],
  ];
  const errores = {};
  for (const detalle of mensaje.split(' · ')) {
    const campo = coincidencias.find(([, patron]) => patron.test(detalle))?.[0];
    if (!campo) continue;
    if (/should not be empty|must be a string/i.test(detalle))
      errores[campo] = campo === 'name' ? 'Escribe el nombre completo.' : campo === 'specialty' ? 'Escribe la especialidad.' : campo === 'email' ? 'Escribe el correo electrónico.' : detalle;
    else if (/must be an email/i.test(detalle)) errores[campo] = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (/must be shorter than or equal to 150 characters/i.test(detalle))
      errores[campo] = `El ${etiquetas[campo].toLowerCase()} no puede superar 150 caracteres.`;
    else errores[campo] = detalle;
  }
  return Object.keys(errores).length ? errores : null;
}

function contenedorCampo(formulario, campo) {
  return formulario.querySelector(`[data-campo-profesional="${campo}"]`);
}

export function limpiarErroresProfesional(formulario) {
  formulario.querySelectorAll('.profesionales-error-campo').forEach((elemento) => elemento.remove());
  formulario.querySelectorAll('[data-campo-profesional]').forEach((contenedor) => {
    contenedor.classList.remove('has-error');
    contenedor.removeAttribute('aria-invalid');
    contenedor.removeAttribute('aria-describedby');
    contenedor.querySelectorAll('input').forEach((entrada) => {
      entrada.removeAttribute('aria-invalid');
      entrada.removeAttribute('aria-describedby');
    });
  });
  const general = formulario.querySelector('#error-formulario');
  if (general) { general.hidden = true; general.textContent = ''; }
}

export function mostrarErroresProfesional(formulario, errores) {
  limpiarErroresProfesional(formulario);
  const primero = Object.keys(errores)[0];
  for (const [campo, mensaje] of Object.entries(errores)) {
    const contenedor = contenedorCampo(formulario, campo);
    if (!contenedor) continue;
    const id = `error-profesional-${campo}`;
    const nota = document.createElement('p');
    nota.id = id;
    nota.className = 'profesionales-error-campo';
    nota.setAttribute('role', 'alert');
    nota.textContent = mensaje;
    contenedor.append(nota);
    contenedor.classList.add('has-error');
    contenedor.setAttribute('aria-invalid', 'true');
    contenedor.setAttribute('aria-describedby', id);
    contenedor.querySelectorAll('input:not(:disabled)').forEach((entrada) => {
      entrada.setAttribute('aria-invalid', 'true');
      entrada.setAttribute('aria-describedby', id);
    });
  }
  const destino = contenedorCampo(formulario, primero);
  const foco = destino?.querySelector('input:not(:disabled)') || destino;
  foco?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  foco?.focus({ preventScroll: true });
}

export function limpiarCampoProfesional(formulario, entrada) {
  const contenedor = entrada.closest('[data-campo-profesional]');
  if (!contenedor?.classList.contains('has-error')) return;
  contenedor.querySelector('.profesionales-error-campo')?.remove();
  contenedor.classList.remove('has-error');
  contenedor.removeAttribute('aria-invalid');
  contenedor.removeAttribute('aria-describedby');
  contenedor.querySelectorAll('input').forEach((elemento) => {
    elemento.removeAttribute('aria-invalid'); elemento.removeAttribute('aria-describedby');
  });
}
