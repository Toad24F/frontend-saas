import {
  createRefreshCoordinator,
  createVersionCheck,
} from '../../modules/agenda/live-refresh.js';

const coordinator = createRefreshCoordinator();
export const registerLiveRefresh = (check) => coordinator.add(check);

// No hay escrituras ni sondeos en pestañas ocultas. El foco comprueba enseguida lo que pudo cambiar fuera.
function refresh() {
  if (
    document.visibilityState !== 'hidden' &&
    document.documentElement.dataset.appMode === 'connected'
  )
    void coordinator.run();
}
setInterval(refresh, 30000);
window.addEventListener('focus', refresh);
document.addEventListener('visibilitychange', refresh);

// Una lectura remota nunca sustituye el formulario. Avisa a sus editores y conserva los campos y el foco.
export function watchRecord(root, { read, version, active }) {
  let remove;
  const check = createVersionCheck({
    read,
    version,
    active: () => root.isConnected && root.closest('dialog')?.open && active(),
    notify: (event) => {
      const forms = root.matches('form')
        ? [root]
        : root.querySelectorAll('form');
      for (const form of forms)
        form.dispatchEvent(
          new CustomEvent('m4-record-obsolete', { detail: event }),
        );
      remove();
    },
  });
  remove = registerLiveRefresh(() => {
    if (!root.isConnected || !root.closest('dialog')?.open || !active()) {
      remove();
      return;
    }
    return check();
  });
  root.closest('dialog')?.addEventListener('close', remove, { once: true });
}
