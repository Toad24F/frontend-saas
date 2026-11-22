import { abrirEditorMarca } from '../../../shared/personalizacion.editor.js';
import { acentoPredeterminadoPortal as acentoPredeterminado } from '../../../shared/personalizacion.marca.js';

const marcasDemo = new Map();

export function abrirMarcaDemo(negocio) {
  let provisional;
  const consultar = () => marcasDemo.get(negocio.id) ?? { version: 0, acento: acentoPredeterminado, logoId: null, acentoPredeterminado };

  // Cada negocio de la demo guarda su muestra en memoria. No se llama a la API conectada.
  function publicar({ version, acento, logoId }) {
    const anterior = consultar().logoId;
    const siguiente = logoId === 'provisional' ? URL.createObjectURL(provisional) : logoId;
    if (anterior && anterior !== siguiente) URL.revokeObjectURL(anterior);
    marcasDemo.set(negocio.id, { version: version + 1, acento, logoId: siguiente, acentoPredeterminado });
  }

  abrirEditorMarca({ demo: true, slug: negocio.slug, nombre: negocio.name, client: {
    consultar, publicar,
    cargar(_version, archivo) { provisional = archivo; return { id: 'provisional' }; },
    restaurar: (version) => publicar({ version, acento: acentoPredeterminado, logoId: null }),
  } });
}
