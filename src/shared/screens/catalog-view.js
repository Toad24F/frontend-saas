const storageKey = 'citalendar-catalog-view';
const previousKeys = [
  'citalendar-professionals-view',
  'citalendar-receptionists-view',
  'citalendar-services-view',
  'citalendar-branches-view',
];
const valid = (view) => view === 'list' || view === 'cards';

let currentView = 'list';
try {
  const saved = localStorage.getItem(storageKey);
  const previous = previousKeys.map((key) => localStorage.getItem(key)).find(valid);
  currentView = valid(saved) ? saved : previous || 'list';
} catch { /* La preferencia funciona durante la sesión sin almacenamiento local. */ }

export function getCatalogView() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (valid(saved)) currentView = saved;
  } catch { /* Se usa la preferencia de esta sesión. */ }
  return currentView;
}

export function setCatalogView(view) {
  if (!valid(view) || matchMedia('(max-width: 767px)').matches || getCatalogView() === view) return false;
  currentView = view;
  try { localStorage.setItem(storageKey, view); } catch { /* Preferencia temporal. */ }
  return true;
}
