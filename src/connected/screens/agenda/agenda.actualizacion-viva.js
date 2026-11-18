import {
  crearCoordinadorRefresco,
  crearComprobacionVersion,
} from '../../modules/agenda/agenda.refresco-vivo.js';

const coordinador = crearCoordinadorRefresco();
export const registrarRefrescoVivo = (comprobar) => coordinador.add(comprobar);

// No hay escrituras ni sondeos en pestañas ocultas. El foco comprueba enseguida lo que pudo cambiar fuera.
function refrescar() {
  if (
    document.visibilityState !== 'hidden' &&
    document.documentElement.dataset.appMode === 'connected'
  )
    void coordinador.run();
}
setInterval(refrescar, 30000);
window.addEventListener('focus', refrescar);
document.addEventListener('visibilitychange', refrescar);

// Una lectura remota nunca sustituye el formulario. Avisa a sus editores y conserva los campos y el foco.
export function observarRegistro(raiz, { read: leer, version, active: activo }) {
  let remove;
  const comprobar = crearComprobacionVersion({
    read: leer,
    version,
    active: () => raiz.isConnected && raiz.closest('dialog')?.open && activo(),
    notify: (evento) => {
      const formularios = raiz.matches('form')
        ? [raiz]
        : raiz.querySelectorAll('form');
      for (const formulario of formularios)
        formulario.dispatchEvent(
          new CustomEvent('registro-desactualizado', { detail: evento }),
        );
      remove();
    },
  });
  remove = registrarRefrescoVivo(() => {
    if (!raiz.isConnected || !raiz.closest('dialog')?.open || !activo()) {
      remove();
      return;
    }
    return comprobar();
  });
  raiz.closest('dialog')?.addEventListener('close', remove, { once: true });
}
