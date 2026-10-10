import { db, replaceData, TODAY, addDays, date, time, minutes } from '../shared/data.js';

const names = [
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
export async function loadData() {
  const response = await fetch('/data/demo.json');
  if (!response.ok)
    throw new Error('No se pudieron cargar los datos de demostración.');
  replaceData(await response.json());
  db.clients = names.map((name, i) => ({
    id: i + 1,
    tenantId: 1,
    name,
    phone: `614555${String(i + 10).padStart(4, '0')}`,
  }));
  db.clients.push({
    id: 21,
    tenantId: 2,
    name: 'Isabel Fuentes',
    phone: '6145550210',
  });
  db.appointments = [];
  db.blocks = [];
  db.holds = [];
  db.schedules = db.professionals.flatMap((p) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: p.id * 10 + i,
      tenantId: p.tenantId,
      professionalId: p.id,
      day: i + 1,
      branchId: p.branchIds[i % p.branchIds.length],
      start: '09:00',
      breakStart: p.id === 1 && i === 5 ? '' : '13:00',
      breakEnd: p.id === 1 && i === 5 ? '' : '14:00',
      end: i === 5 ? (p.id === 1 ? '13:00' : '14:00') : '18:00',
      enabled: i < 5 || (p.id === 1 && i === 5),
    })),
  );
  db.schedules.push({
    id: Math.max(...db.schedules.map((s) => s.id)) + 1,
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
  const monday = addDays(TODAY, 1 - (date(TODAY).getDay() || 7));
  const seeds = [
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
  seeds.forEach(([d, start, p, c, status], i) => {
    const professional = db.professionals.find((x) => x.id === p),
      service = db.services.find((x) => x.id === professional.serviceIds[0]);
    db.appointments.push({
      id: i + 1,
      tenantId: 1,
      branchId: professional.branchIds[d % 2],
      professionalId: p,
      serviceId: service.id,
      clientId: c,
      date: addDays(monday, d),
      start,
      end: time(minutes(start) + service.duration),
      status,
      folio: `CB-2609-${String(i + 1).padStart(4, '0')}`,
      reason: '',
      origin: 'portal_publico',
    });
  });
  db.appointments.push({
    id: 24,
    tenantId: 2,
    branchId: 3,
    professionalId: 5,
    serviceId: 5,
    clientId: 21,
    date: TODAY,
    start: '09:00',
    end: '10:00',
    status: 'confirmada',
    folio: 'EM-2609-0001',
    reason: '',
    origin: 'portal_publico',
  });
  db.blocks.push({
    id: 1,
    tenantId: 1,
    professionalId: 4,
    branchId: 1,
    date: addDays(monday, 2),
    endDate: addDays(monday, 2),
    start: '09:00',
    end: '11:00',
    type: 'emergencia',
    reason: 'Capacitación del equipo',
  });
  return db;
}
