import { esDemo, api, usuarioActual, crearPayloadCatalogo } from '../../../connected/backend.js';
import { estadoAplicacion } from '../../aplicacion.nucleo.js';
import { datosAplicacion, listarRegistros, obtenerRecurso } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { mostrarAviso, escaparHtml as esc } from '../../interfaz.componentes.js';
import { renderCampo, renderSelector, abrirFormulario } from '../../formularios.componentes.js';
import { consultarRegistroEditable } from '../../../connected/modules/catalogos/catalogos.detalle.js';
import { validarProfesional, interpretarErrorProfesional, mostrarErroresProfesional, limpiarErroresProfesional, limpiarCampoProfesional } from '../profesionales/profesionales.errores.js';
import { validarServicio, interpretarErrorServicio } from '../servicios/servicios.errores.js';
import { validarSucursal, interpretarErrorSucursal } from '../sucursales/sucursales.errores.js';
import { ZONAS_HORARIAS_MEXICO } from '../sucursales/sucursales.zonas-horarias.js';
import { leerCupoRolPropio, renderAvisoCupoPropio } from '../../../connected/screens/negocio/usuarios.cupo.js';

const campoMarcado = (...argumentos) => renderCampo(...argumentos).replace('class="form-field"', `class="form-field" data-campo-profesional="${argumentos[1]}"`);
const selectorMarcado = (...argumentos) => renderSelector(...argumentos).replace('class="form-field"', `class="form-field" data-campo-profesional="${argumentos[1]}"`);
const errorAsignacion = (campo, mensaje) => Object.assign(new Error(mensaje), { field: campo });
export async function abrirEditorCatalogo(tipo, id) {
  const cacheado = id ? obtenerRecurso(tipo, id, estadoAplicacion.negocioId) : null;
  const existente = cacheado && !esDemo && (tipo !== 'professionals' || usuarioActual.rol === 'admin_negocio') ? await consultarRegistroEditable(tipo, cacheado) : cacheado;
  if (tipo === 'services') {
    if (!esDemo && usuarioActual.rol === 'profesional' && existente && existente.creatorId !== usuarioActual.id) {
      mostrarAviso('Solo puedes editar los servicios que creaste.');
      return;
    }
    const dialogo = abrirFormulario(
      existente ? 'Editar servicio' : 'Nuevo servicio',
      `${campoMarcado('Nombre del servicio', 'name', existente?.name, 'text', 'required maxlength="150"')}${campoMarcado('Descripción', 'description', existente?.description, 'text', esDemo ? 'required maxlength="200"' : 'maxlength="500"')}<div class="form-row-two">${campoMarcado('Duración en minutos', 'duration', existente?.duration || 45, 'number', esDemo ? 'required min="15" max="240" step="15"' : 'required min="1" step="1"')}${campoMarcado('Precio informativo (MXN)', 'price', existente?.price ?? 600, 'number', 'required min="0" max="99999" step="0.01"')}</div>`,
      (datos) =>
        guardarRegistroCatalogo('services', existente, {
          name: datos.get('name').trim(),
          description: datos.get('description'),
          duration: Number(datos.get('duration')),
          price: Number(datos.get('price')),
          icon: existente?.icon || 'briefcase',
          color: existente?.color || 'blue',
        }),
      false,
      {
        panelLateral: true,
        validar(formulario) {
          const errores = validarServicio(new FormData(formulario), esDemo);
          if (!Object.keys(errores).length) { limpiarErroresProfesional(formulario); return true; }
          mostrarErroresProfesional(formulario, errores);
          return false;
        },
        alFallar(error, formulario) {
          const errores = interpretarErrorServicio(error);
          if (errores) mostrarErroresProfesional(formulario, errores);
          else {
            const destino = formulario.querySelector('#form-error');
            destino.textContent = error.message || 'No se pudo guardar el servicio. Inténtalo de nuevo.';
            destino.hidden = false;
            destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
            destino.focus({ preventScroll: true });
          }
        },
      },
    );
    const formulario = dialogo.querySelector('#editor-form');
    formulario.addEventListener('input', (evento) => limpiarCampoProfesional(formulario, evento.target));
    formulario.addEventListener('change', (evento) => limpiarCampoProfesional(formulario, evento.target));
  }
  if (tipo === 'branches') {
    const dialogo = abrirFormulario(
      existente ? 'Editar sucursal' : 'Nueva sucursal',
      `${campoMarcado('Nombre', 'name', existente?.name, 'text', 'required maxlength="150"')}${campoMarcado('Dirección', 'address', existente?.address, 'text', 'required maxlength="255"')}${campoMarcado('Teléfono', 'phone', existente?.phone, 'tel', esDemo ? 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"' : 'required minlength="7" maxlength="20"')}${campoMarcado('Indicaciones de llegada', 'notes', existente?.notes, 'text', 'maxlength="255"')}${esDemo ? '' : selectorMarcado('Zona horaria', 'timezone', ZONAS_HORARIAS_MEXICO, existente?.timezone || 'America/Chihuahua')}${campoMarcado('Enlace de Google Maps', 'maps', existente?.maps || '', 'url', 'maxlength="2048"')}`,
      (datos) =>
        guardarRegistroCatalogo('branches', existente, {
          name: datos.get('name').trim(),
          address: datos.get('address'),
          phone: datos.get('phone'),
          notes: datos.get('notes'), timezone: datos.get('timezone'), maps: datos.get('maps'),
          color: existente?.color || 'orange',
        }),
      false,
      {
        panelLateral: true,
        validar(formulario) {
          const errores = validarSucursal(new FormData(formulario), esDemo);
          if (!Object.keys(errores).length) { limpiarErroresProfesional(formulario); return true; }
          mostrarErroresProfesional(formulario, errores);
          return false;
        },
        alFallar(error, formulario) {
          const errores = interpretarErrorSucursal(error);
          if (errores) mostrarErroresProfesional(formulario, errores);
          else {
            const destino = formulario.querySelector('#form-error');
            destino.textContent = error.message || 'No se pudo guardar la sucursal. Inténtalo de nuevo.';
            destino.hidden = false;
            destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
            destino.focus({ preventScroll: true });
          }
        },
      },
    );
    const formulario = dialogo.querySelector('#editor-form');
    formulario.addEventListener('input', (evento) => limpiarCampoProfesional(formulario, evento.target));
    formulario.addEventListener('change', (evento) => limpiarCampoProfesional(formulario, evento.target));
  }
  if (tipo === 'professionals') {
    if (esDemo && (
      !listarRegistros('services', estadoAplicacion.negocioId).length ||
      !listarRegistros('branches', estadoAplicacion.negocioId).length
    )) {
      mostrarAviso('Crea al menos un servicio y una sucursal primero.');
      return;
    }
    const propio = !esDemo && usuarioActual.rol === 'profesional';
    let introduccionCupo = '';
    if (!esDemo && !existente && usuarioActual.rol === 'admin_negocio') {
      // El alta muestra el cupo de la ruta propia; una lectura fallida no se
      // convierte en un límite local supuesto.
      try { introduccionCupo = renderAvisoCupoPropio('profesionales', await leerCupoRolPropio('profesionales', api)); }
      catch { introduccionCupo = '<p class="form-intro">No se pudo consultar el cupo vigente. El servidor lo comprobará al guardar.</p>'; }
    }
    let idVigente = existente?.id;
    const dialogo = abrirFormulario(
      existente ? 'Editar profesional' : 'Nuevo profesional',
      `${introduccionCupo}${campoMarcado('Nombre completo', 'name', existente?.name, 'text', propio ? 'readonly' : 'required maxlength="150"')}${propio ? '' : campoMarcado('Especialidad', 'specialty', existente?.specialty, 'text', 'required maxlength="150"')}${campoMarcado('Correo', 'email', existente?.email, 'email', propio ? 'readonly' : 'required maxlength="150"')}${esDemo || propio ? '' : campoMarcado(existente ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', existente ? 'autocomplete="new-password" minlength="12"' : 'required autocomplete="new-password" minlength="12"')}${esDemo ? `<div class="form-field profesionales-grupo-eleccion" data-campo-profesional="services" role="group" aria-labelledby="servicios-profesional-etiqueta" tabindex="-1"><span class="form-label" id="servicios-profesional-etiqueta">Servicios que ofrece</span><div class="checkbox-list">${(existente?.catalogServices || listarRegistros(
        'services',
        estadoAplicacion.negocioId,
      ))
        .map(
          (s) =>
            `<label><input type="checkbox" class="form-check-input" name="services" value="${s.id}" ${!esDemo && s.active === false && !existente?.serviceIds.includes(s.id) ? 'disabled' : ''} ${existente?.serviceIds.includes(s.id) ? 'checked' : ''}/> ${esc(s.name)}</label>`,
        )
        .join(
          '',
      )}</div></div><div class="form-field profesionales-grupo-eleccion" data-campo-profesional="branches" role="group" aria-labelledby="sucursales-profesional-etiqueta" tabindex="-1"><span class="form-label" id="sucursales-profesional-etiqueta">Sucursales</span><div class="checkbox-list">${(existente?.catalogBranches || listarRegistros(
        'branches',
        estadoAplicacion.negocioId,
      ))
        .map(
          (b) =>
            `<label><input type="checkbox" class="form-check-input" name="branches" value="${b.id}" ${propio ? 'disabled' : ''} ${existente?.branchIds.includes(b.id) ? 'checked' : ''}/> ${esc(b.name)}</label>`,
        )
        .join('')}</div></div>` : '<p class="field-hint">Después de guardar, abre Ver disponibilidad para asignar sucursales y configurar servicios.</p>'}`,
      async (datos) => {
        if (!esDemo) {
          const identidad = { nombre: datos.get('name').trim(), correo: datos.get('email').trim(), especialidad: datos.get('specialty').trim(), ...(datos.get('password') ? { password: datos.get('password') } : {}) };
          const guardado = await api(idVigente ? `/profesionales/${idVigente}` : '/profesionales', idVigente ? 'PATCH' : 'POST', identidad);
          idVigente = guardado.id;
          return;
        }
        const servicioIds = datos.getAll('services').map(Number),
          sucursalIds = datos.getAll('branches').map(Number);
        servicioIds.forEach((id) => obtenerRecurso('services', id, estadoAplicacion.negocioId));
        sucursalIds.forEach((id) => obtenerRecurso('branches', id, estadoAplicacion.negocioId));
        if (existente) {
          const vinculadas = listarRegistros('appointments', estadoAplicacion.negocioId).filter(
            (cita) =>
              cita.professionalId === existente.id &&
              !['cancelada', 'no_asistio', 'completada'].includes(cita.status),
          );
          if (vinculadas.some((cita) => !servicioIds.includes(cita.serviceId)))
            throw errorAsignacion('services', 'Hay citas activas con un servicio que quitaste. Conserva ese servicio hasta que terminen las citas.');
          if (vinculadas.some((cita) => !sucursalIds.includes(cita.branchId)))
            throw errorAsignacion('branches', 'Hay citas activas en una sucursal que quitaste. Conserva esa sucursal hasta que terminen las citas.');
        }
        const profesional = guardarRegistroCatalogo('professionals', existente, {
          name: datos.get('name').trim(),
          specialty: datos.get('specialty'),
          email: datos.get('email'),
          initials: datos
            .get('name')
            .split(' ')
            .slice(-2)
            .map((palabra) => palabra[0])
            .join(''),
          color: existente?.color || 'peach',
          serviceIds: servicioIds,
          branchIds: sucursalIds,
        });
        if (!existente)
          for (let dia = 1; dia <= 6; dia++)
            datosAplicacion.schedules.push({
              id: Math.max(0, ...datosAplicacion.schedules.map((horario) => horario.id)) + 1,
              tenantId: estadoAplicacion.negocioId,
              professionalId: profesional.id,
              day: dia,
              branchId: sucursalIds[(dia - 1) % sucursalIds.length],
              start: '09:00',
              breakStart: '13:00',
              breakEnd: '14:00',
              end: '18:00',
              enabled: dia < 6,
            });
        else
          listarRegistros('schedules', estadoAplicacion.negocioId)
            .filter(
              (horario) =>
                horario.professionalId === existente.id &&
                !sucursalIds.includes(horario.branchId),
            )
            .forEach((horario) => (horario.branchId = sucursalIds[0]));
      },
      true,
      {
        panelLateral: true,
        validar(formulario) {
          const errores = validarProfesional(new FormData(formulario), { propio, existente: Boolean(existente), demo: esDemo });
          if (!Object.keys(errores).length) { limpiarErroresProfesional(formulario); return true; }
          mostrarErroresProfesional(formulario, errores);
          return false;
        },
        alFallar(error, formulario) {
          const errores = interpretarErrorProfesional(error);
          if (errores) mostrarErroresProfesional(formulario, errores);
          else {
            const destino = formulario.querySelector('#form-error');
            destino.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
            destino.hidden = false;
            destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
            destino.focus({ preventScroll: true });
          }
        },
      },
    );
    dialogo.querySelector('#editor-form').addEventListener('input', (evento) => limpiarCampoProfesional(evento.currentTarget, evento.target));
    dialogo.querySelector('#editor-form').addEventListener('change', (evento) => limpiarCampoProfesional(evento.currentTarget, evento.target));
  }
}
export function guardarRegistroCatalogo(tipo, existente, valores) {
  if (!esDemo) {
    const ruta = tipo === 'services' ? '/servicios' : '/sucursales';
    const payload = crearPayloadCatalogo(tipo, valores);
    return api(existente ? `${ruta}/${existente.id}` : ruta, existente ? 'PATCH' : 'POST', payload);
  }
  if (!valores.name?.trim()) throw new Error('El nombre es obligatorio.');
  if (existente) {
    Object.assign(obtenerRecurso(tipo, existente.id, estadoAplicacion.negocioId), valores);
    return existente;
  }
  const registro = {
    id: Math.max(0, ...datosAplicacion[tipo].map((registro) => registro.id)) + 1,
    tenantId: estadoAplicacion.negocioId,
    ...valores,
  };
  datosAplicacion[tipo].push(registro);
  return registro;
}
