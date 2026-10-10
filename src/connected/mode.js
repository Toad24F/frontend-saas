export const isDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export const pending = 'Aún no forma parte de esta entrega';
export const modeUrl = (path, demo = isDemo) => `${path}${demo ? '?demo=1' : ''}`;
