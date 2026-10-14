const labels = {
  name: 'Nombre completo', specialty: 'Especialidad', email: 'Correo',
  password: 'Contraseña', services: 'Servicios que ofrece', branches: 'Sucursales',
};

export function validateProfessional(data, { own = false, existing = false, demo = false } = {}) {
  const errors = {};
  if (!own) {
    const name = String(data.get('name') || '').trim();
    const specialty = String(data.get('specialty') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    if (!name) errors.name = 'Escribe el nombre completo.';
    else if (name.length > 150) errors.name = 'El nombre no puede superar 150 caracteres.';
    if (!specialty) errors.specialty = 'Escribe la especialidad.';
    else if (specialty.length > 150) errors.specialty = 'La especialidad no puede superar 150 caracteres.';
    if (!email) errors.email = 'Escribe el correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (email.length > 150) errors.email = 'El correo no puede superar 150 caracteres.';
    if (!demo && (!existing || password)) {
      if (!password) errors.password = 'Escribe una contraseña.';
      else if (password.length < 12) errors.password = 'Usa al menos 12 caracteres.';
      else if (new TextEncoder().encode(password).length > 72) errors.password = 'La contraseña no puede superar 72 bytes.';
    }
  }
  if (demo && !data.getAll('services').length) errors.services = 'Selecciona al menos un servicio.';
  if (demo && !data.getAll('branches').length) errors.branches = 'Selecciona al menos una sucursal.';
  return errors;
}

export function professionalError(error) {
  if (error.field && labels[error.field]) return { [error.field]: error.message };
  const message = String(error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
  const matchers = [
    ['name', /nombre|name/i], ['specialty', /especialidad|specialty/i],
    ['email', /correo|email/i], ['password', /contraseñ|password/i],
    ['services', /servicio|service/i], ['branches', /sucursal|branch|franja/i],
  ];
  const errors = {};
  for (const detail of message.split(' · ')) {
    const field = matchers.find(([, pattern]) => pattern.test(detail))?.[0];
    if (!field) continue;
    if (/should not be empty|must be a string/i.test(detail))
      errors[field] = field === 'name' ? 'Escribe el nombre completo.' : field === 'specialty' ? 'Escribe la especialidad.' : field === 'email' ? 'Escribe el correo electrónico.' : detail;
    else if (/must be an email/i.test(detail)) errors[field] = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (/must be shorter than or equal to 150 characters/i.test(detail))
      errors[field] = `El ${labels[field].toLowerCase()} no puede superar 150 caracteres.`;
    else errors[field] = detail;
  }
  return Object.keys(errors).length ? errors : null;
}

function fieldContainer(form, field) {
  return form.querySelector(`[data-professional-field="${field}"]`);
}

export function clearProfessionalErrors(form) {
  form.querySelectorAll('.professional-field-error').forEach((item) => item.remove());
  form.querySelectorAll('[data-professional-field]').forEach((container) => {
    container.classList.remove('has-error');
    container.removeAttribute('aria-invalid');
    container.removeAttribute('aria-describedby');
    container.querySelectorAll('input').forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
  });
  const general = form.querySelector('#form-error');
  if (general) { general.hidden = true; general.textContent = ''; }
}

export function showProfessionalErrors(form, errors) {
  clearProfessionalErrors(form);
  const first = Object.keys(errors)[0];
  for (const [field, message] of Object.entries(errors)) {
    const container = fieldContainer(form, field);
    if (!container) continue;
    const id = `professional-error-${field}`;
    const note = document.createElement('p');
    note.id = id;
    note.className = 'professional-field-error';
    note.setAttribute('role', 'alert');
    note.textContent = message;
    container.append(note);
    container.classList.add('has-error');
    container.setAttribute('aria-invalid', 'true');
    container.setAttribute('aria-describedby', id);
    container.querySelectorAll('input:not(:disabled)').forEach((input) => {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id);
    });
  }
  const target = fieldContainer(form, first);
  const focus = target?.querySelector('input:not(:disabled)') || target;
  focus?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  focus?.focus({ preventScroll: true });
}

export function clearProfessionalField(form, input) {
  const container = input.closest('[data-professional-field]');
  if (!container?.classList.contains('has-error')) return;
  container.querySelector('.professional-field-error')?.remove();
  container.classList.remove('has-error');
  container.removeAttribute('aria-invalid');
  container.removeAttribute('aria-describedby');
  container.querySelectorAll('input').forEach((item) => {
    item.removeAttribute('aria-invalid'); item.removeAttribute('aria-describedby');
  });
}
