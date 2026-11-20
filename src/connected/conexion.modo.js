export const esDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export const mensajePendiente = 'Aún no forma parte de esta entrega';
export const urlSegunModo = (ruta, demo = esDemo) => `${ruta}${demo ? '?demo=1' : ''}`;
