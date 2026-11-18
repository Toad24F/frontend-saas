import { idPositivo } from '../agenda/agenda.cambio-horario.js';

// La ficha actual es independiente de los contactos históricos guardados en las citas.
export function crearPayloadCliente(valores, correccion = false) {
  const payload = {};
  if (!correccion || Object.hasOwn(valores, 'nombreCompleto')) {
    if (typeof valores.nombreCompleto !== 'string')
      throw new Error('Indica el nombre completo.');
    payload.nombreCompleto = valores.nombreCompleto.trim();
    if (!payload.nombreCompleto || [...payload.nombreCompleto].length > 150)
      throw new Error('El nombre debe contener entre 1 y 150 caracteres.');
  }
  if (!correccion || Object.hasOwn(valores, 'telefono')) {
    if (typeof valores.telefono !== 'string')
      throw new Error('Indica el teléfono.');
    payload.telefono = valores.telefono.replace(/[\s-]/g, '').replace(/^\+52/, '');
    if (!/^\d{10}$/.test(payload.telefono))
      throw new Error('El teléfono debe tener diez dígitos.');
  }
  if (!Object.keys(payload).length)
    throw new Error('Indica al menos un campo que corregir.');
  if (correccion) payload.version = idPositivo(valores.version);
  return payload;
}
function validarFicha(valor, id) {
  if (
    !valor ||
    !Number.isInteger(valor.id) ||
    valor.id < 1 ||
    (id != null && valor.id !== id) ||
    !Number.isInteger(valor.negocioId) ||
    valor.negocioId < 1 ||
    !Number.isInteger(valor.version) ||
    valor.version < 1 ||
    typeof valor.nombreCompleto !== 'string' ||
    typeof valor.telefono !== 'string'
  )
    throw new Error('La ficha recibida no es válida.');
  return valor;
}
function validarNumeroPagina(valor = 1) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 1000000)
    throw new Error('Página inválida.');
  return valor;
}
function validarPagina(valor, clave, numero, validarFila, limite = 50) {
  if (
    !valor ||
    !Array.isArray(valor[clave]) ||
    valor.pagina !== numero ||
    valor.limite !== limite ||
    typeof valor.hayMas !== 'boolean' ||
    valor[clave].length > limite
  )
    throw new Error('La página recibida no es válida.');
  valor[clave].forEach(validarFila);
  return valor;
}
export function crearClientesClient(solicitar) {
  return {
    async listar(filtros = {}) {
      const numero = validarNumeroPagina(filtros.pagina),
        limite = filtros.limite ?? 50,
        busqueda = (filtros.busqueda ?? '').trim();
      if (
        !Number.isInteger(limite) ||
        limite < 1 ||
        limite > 100 ||
        [...busqueda].length > 150 ||
        /[\u0000-\u001f\u007f]/.test(busqueda)
      )
        throw new Error('Filtros de clientes inválidos.');
      const consulta = new URLSearchParams();
      if (busqueda) consulta.set('busqueda', busqueda);
      consulta.set('pagina', numero);
      consulta.set('limite', limite);
      return validarPagina(
        await solicitar(`/clientes?${consulta}`),
        'clientes',
        numero,
        (fila) => validarFicha(fila),
        limite,
      );
    },
    async consultar(id) {
      idPositivo(id);
      return validarFicha(await solicitar(`/clientes/${id}`), id);
    },
    async consultarHistorial(id, numero = 1) {
      idPositivo(id);
      validarNumeroPagina(numero);
      // No completar snapshots ausentes con la ficha actual ni con catálogos vigentes.
      return validarPagina(
        await solicitar(`/clientes/${id}/citas?pagina=${numero}&limite=50`),
        'citas',
        numero,
        (fila) => {
          if (
            !fila ||
            fila.clienteId !== id ||
            !Number.isInteger(fila.id) ||
            fila.id < 1 ||
            !Number.isFinite(Date.parse(fila.inicioUtc)) ||
            !Number.isFinite(Date.parse(fila.finUtc)) ||
            !fila.zonaHoraria
          )
            throw new Error('El historial recibido no es válido.');
        },
      );
    },
    async crear(valores) {
      return validarFicha(
        await solicitar('/clientes', 'POST', crearPayloadCliente(valores)),
      );
    },
    async corregir(id, valores) {
      idPositivo(id);
      return validarFicha(
        await solicitar(
          `/clientes/${id}`,
          'PATCH',
          crearPayloadCliente(valores, true),
        ),
        id,
      );
    },
  };
}
