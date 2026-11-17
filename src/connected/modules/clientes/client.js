import { positiveId } from '../agenda/schedule-change.js';

// La ficha actual es independiente de los contactos históricos guardados en las citas.
export function customerPayload(values, correction = false) {
  const body = {};
  if (!correction || Object.hasOwn(values, 'nombreCompleto')) {
    if (typeof values.nombreCompleto !== 'string')
      throw new Error('Indica el nombre completo.');
    body.nombreCompleto = values.nombreCompleto.trim();
    if (!body.nombreCompleto || [...body.nombreCompleto].length > 150)
      throw new Error('El nombre debe contener entre 1 y 150 caracteres.');
  }
  if (!correction || Object.hasOwn(values, 'telefono')) {
    if (typeof values.telefono !== 'string')
      throw new Error('Indica el teléfono.');
    body.telefono = values.telefono.replace(/[\s-]/g, '').replace(/^\+52/, '');
    if (!/^\d{10}$/.test(body.telefono))
      throw new Error('El teléfono debe tener diez dígitos.');
  }
  if (!Object.keys(body).length)
    throw new Error('Indica al menos un campo que corregir.');
  if (correction) body.version = positiveId(values.version);
  return body;
}
function customer(value, id) {
  if (
    !value ||
    !Number.isInteger(value.id) ||
    value.id < 1 ||
    (id != null && value.id !== id) ||
    !Number.isInteger(value.negocioId) ||
    value.negocioId < 1 ||
    !Number.isInteger(value.version) ||
    value.version < 1 ||
    typeof value.nombreCompleto !== 'string' ||
    typeof value.telefono !== 'string'
  )
    throw new Error('La ficha recibida no es válida.');
  return value;
}
function pageNumber(value = 1) {
  if (!Number.isInteger(value) || value < 1 || value > 1000000)
    throw new Error('Página inválida.');
  return value;
}
function page(value, key, number, validate, limit = 50) {
  if (
    !value ||
    !Array.isArray(value[key]) ||
    value.pagina !== number ||
    value.limite !== limit ||
    typeof value.hayMas !== 'boolean' ||
    value[key].length > limit
  )
    throw new Error('La página recibida no es válida.');
  value[key].forEach(validate);
  return value;
}
export function createCustomerClient(request) {
  return {
    async list(filters = {}) {
      const number = pageNumber(filters.pagina),
        limit = filters.limite ?? 50,
        search = (filters.busqueda ?? '').trim();
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        [...search].length > 150 ||
        /[\u0000-\u001f\u007f]/.test(search)
      )
        throw new Error('Filtros de clientes inválidos.');
      const query = new URLSearchParams();
      if (search) query.set('busqueda', search);
      query.set('pagina', number);
      query.set('limite', limit);
      return page(
        await request(`/clientes?${query}`),
        'clientes',
        number,
        (row) => customer(row),
        limit,
      );
    },
    async detail(id) {
      positiveId(id);
      return customer(await request(`/clientes/${id}`), id);
    },
    async history(id, number = 1) {
      positiveId(id);
      pageNumber(number);
      // No completar snapshots ausentes con la ficha actual ni con catálogos vigentes.
      return page(
        await request(`/clientes/${id}/citas?pagina=${number}&limite=50`),
        'citas',
        number,
        (row) => {
          if (
            !row ||
            row.clienteId !== id ||
            !Number.isInteger(row.id) ||
            row.id < 1 ||
            !Number.isFinite(Date.parse(row.inicioUtc)) ||
            !Number.isFinite(Date.parse(row.finUtc)) ||
            !row.zonaHoraria
          )
            throw new Error('El historial recibido no es válido.');
        },
      );
    },
    async create(values) {
      return customer(
        await request('/clientes', 'POST', customerPayload(values)),
      );
    },
    async update(id, values) {
      positiveId(id);
      return customer(
        await request(
          `/clientes/${id}`,
          'PATCH',
          customerPayload(values, true),
        ),
        id,
      );
    },
  };
}
