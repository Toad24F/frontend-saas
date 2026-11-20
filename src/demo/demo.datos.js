import { datosAplicacion, reemplazarDatos, HOY, sumarDias, crearFecha, minutosAHora, horaAMinutos } from '../shared/aplicacion.datos.js';

const nombres = [
  'María González',
  'Juan Pérez',
  'Laura Méndez',
  'Roberto Sánchez',
  'Valeria Ortiz',
  'Miguel Herrera',
  'Andrea López',
  'Daniel Ramírez',
  'Fernanda Castro',
  'Luis Hernández',
  'Camila Reyes',
  'Jorge Mendoza',
  'Paola Jiménez',
  'Ricardo Flores',
  'Sofía Vargas',
  'Alejandro Ríos',
  'Gabriela Santos',
  'Emilio Navarro',
  'Lucía Romero',
  'Diego Aguirre',
];
export async function cargarDatosDemo() {
  const respuesta = await fetch('/data/demo.json');
  if (!respuesta.ok)
    throw new Error('No se pudieron cargar los datos de demostración.');
  reemplazarDatos(await respuesta.json());
  datosAplicacion.clients = nombres.map((nombre, indice) => ({
    id: indice + 1,
    tenantId: 1,
    name: nombre,
    phone: `614555${String(indice + 10).padStart(4, '0')}`,
  }));
  datosAplicacion.clients.push({
    id: 21,
    tenantId: 2,
    name: 'Isabel Fuentes',
    phone: '6145550210',
  });
  datosAplicacion.appointments = [];
  datosAplicacion.blocks = [];
  datosAplicacion.holds = [];
  datosAplicacion.schedules = datosAplicacion.professionals.flatMap((profesional) =>
    Array.from({ length: 6 }, (_, indice) => ({
      id: profesional.id * 10 + indice,
      tenantId: profesional.tenantId,
      professionalId: profesional.id,
      day: indice + 1,
      branchId: profesional.branchIds[indice % profesional.branchIds.length],
      start: '09:00',
      breakStart: profesional.id === 1 && indice === 5 ? '' : '13:00',
      breakEnd: profesional.id === 1 && indice === 5 ? '' : '14:00',
      end: indice === 5 ? (profesional.id === 1 ? '13:00' : '14:00') : '18:00',
      enabled: indice < 5 || (profesional.id === 1 && indice === 5),
    })),
  );
  datosAplicacion.schedules.push({
    id: Math.max(...datosAplicacion.schedules.map((franja) => franja.id)) + 1,
    tenantId: 1,
    professionalId: 1,
    day: 6,
    branchId: 1,
    start: '14:00',
    breakStart: '',
    breakEnd: '',
    end: '18:00',
    enabled: true,
  });
  const lunes = sumarDias(HOY, 1 - (crearFecha(HOY).getDay() || 7));
  const citasDeEjemplo = [
    [0, '09:00', 1, 1, 'completada'],
    [0, '10:15', 2, 2, 'completada'],
    [0, '11:30', 3, 3, 'completada'],
    [0, '14:00', 4, 4, 'cancelada'],
    [0, '15:30', 1, 5, 'completada'],
    [1, '09:00', 1, 6, 'completada'],
    [1, '10:00', 2, 7, 'completada'],
    [1, '11:15', 3, 8, 'confirmada'],
    [1, '14:00', 1, 9, 'confirmada'],
    [1, '15:00', 4, 10, 'pendiente'],
    [1, '16:15', 2, 11, 'confirmada'],
    [2, '09:30', 1, 12, 'confirmada'],
    [2, '11:00', 3, 13, 'pendiente'],
    [2, '14:30', 2, 14, 'confirmada'],
    [2, '16:00', 4, 15, 'confirmada'],
    [3, '09:00', 2, 16, 'confirmada'],
    [3, '10:30', 1, 17, 'confirmada'],
    [3, '14:00', 3, 18, 'pendiente'],
    [3, '15:30', 4, 19, 'confirmada'],
    [4, '09:30', 3, 20, 'confirmada'],
    [4, '11:00', 4, 1, 'pendiente'],
    [4, '14:00', 1, 2, 'confirmada'],
    [4, '15:30', 2, 3, 'no_asistio'],
  ];
  citasDeEjemplo.forEach(([desplazamiento, inicio, profesionalId, clienteId, estado], indice) => {
    const profesional = datosAplicacion.professionals.find((registro) => registro.id === profesionalId),
      servicio = datosAplicacion.services.find((registro) => registro.id === profesional.serviceIds[0]);
    datosAplicacion.appointments.push({
      id: indice + 1,
      tenantId: 1,
      branchId: profesional.branchIds[desplazamiento % 2],
      professionalId: profesionalId,
      serviceId: servicio.id,
      clientId: clienteId,
      date: sumarDias(lunes, desplazamiento),
      start: inicio,
      end: minutosAHora(horaAMinutos(inicio) + servicio.duration),
      status: estado,
      folio: `CB-2609-${String(indice + 1).padStart(4, '0')}`,
      reason: '',
      origin: 'portal_publico',
    });
  });
  datosAplicacion.appointments.push({
    id: 24,
    tenantId: 2,
    branchId: 3,
    professionalId: 5,
    serviceId: 5,
    clientId: 21,
    date: HOY,
    start: '09:00',
    end: '10:00',
    status: 'confirmada',
    folio: 'EM-2609-0001',
    reason: '',
    origin: 'portal_publico',
  });
  datosAplicacion.blocks.push({
    id: 1,
    tenantId: 1,
    professionalId: 4,
    branchId: 1,
    date: sumarDias(lunes, 2),
    endDate: sumarDias(lunes, 2),
    start: '09:00',
    end: '11:00',
    type: 'emergencia',
    reason: 'Capacitación del equipo',
  });
  return datosAplicacion;
}
