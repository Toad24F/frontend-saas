const demo = new URLSearchParams(location.search).get('demo') === '1';
if (demo) import('./demo/entry.js');
else import('./connected/entry.js');
