export const acentoPredeterminadoPortal = '#2164d8';
export const rutaBaseMarca = '/negocio/personalizacion';

// Superficies de tema.estilos.css. Se conserva el contraste con las tres
// superficies que pueden servir de fondo a un enlace o indicador de foco.
const superficiesClaras = ['#ffffff', '#f4f5f6', '#eef0f2'];
const superficiesOscuras = ['#15161a', '#202127', '#2b2c33'];
const negro = '#000000';
const blanco = '#ffffff';

const canalesHex = (color) => [1, 3, 5].map((inicio) => parseInt(color.slice(inicio, inicio + 2), 16));

function luminancia(color) {
  const canales = canalesHex(color).map((canal) => {
    const normalizado = canal / 255;
    return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
  });
  return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
}

export function contrastePortal(color, fondo) {
  const a = luminancia(color);
  const b = luminancia(fondo);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function esColorHexadecimalPortal(valor) {
  return typeof valor === 'string' && valor.length === 7 && /^#[0-9a-f]{6}$/i.test(valor);
}

function mezclarCanales(rgb, destino, porcentaje) {
  return '#' + rgb.map((canal) => Math.round(canal + (destino - canal) * porcentaje / 100)
    .toString(16).padStart(2, '0')).join('');
}

function textoSobreRelleno(relleno) {
  return contrastePortal(relleno, negro) >= contrastePortal(relleno, blanco) ? negro : blanco;
}

function tonoLegible(acento, superficies, destino) {
  const rgb = canalesHex(acento);
  // Conserva el tono exacto cuando ya cumple. En otro caso acerca sus canales
  // paso a paso al extremo con contraste para ese tema.
  for (let porcentaje = 0; porcentaje < 100; porcentaje++) {
    const tono = mezclarCanales(rgb, destino, porcentaje);
    if (superficies.every((fondo) => contrastePortal(tono, fondo) >= 4.5)) return tono;
  }
  return destino === 0 ? negro : blanco;
}

export function tonosAcentoPortal(acento) {
  if (!esColorHexadecimalPortal(acento)) return null;
  const relleno = acento.toLowerCase();
  const rgb = canalesHex(relleno);
  // Hover y pulsación mantienen el acento y recalculan el texto para cada relleno.
  const resaltado = mezclarCanales(rgb, 0, 8);
  const pulsado = mezclarCanales(rgb, 0, 14);
  return {
    relleno,
    sobreRelleno: textoSobreRelleno(relleno),
    resaltado,
    sobreResaltado: textoSobreRelleno(resaltado),
    pulsado,
    sobrePulsado: textoSobreRelleno(pulsado),
    claro: tonoLegible(relleno, superficiesClaras, 0),
    oscuro: tonoLegible(relleno, superficiesOscuras, 255),
  };
}

export function rutaLogoPortal(slug, id) {
  if (typeof slug !== 'string' || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return `/publico/negocios/${slug}/logos/${id}`;
}

export function aplicarAcentoPortal(elemento, acento, predeterminado = acentoPredeterminadoPortal) {
  const tonos = esColorHexadecimalPortal(acento) && acento.toLowerCase() !== predeterminado ? tonosAcentoPortal(acento) : null;
  elemento.toggleAttribute('data-marca-personalizada', Boolean(tonos));
  const propiedades = {
    '--marca-relleno': tonos?.relleno,
    '--marca-sobre-relleno': tonos?.sobreRelleno,
    '--marca-relleno-resaltado': tonos?.resaltado,
    '--marca-sobre-resaltado': tonos?.sobreResaltado,
    '--marca-relleno-pulsado': tonos?.pulsado,
    '--marca-sobre-pulsado': tonos?.sobrePulsado,
    '--marca-tono-claro': tonos?.claro,
    '--marca-tono-oscuro': tonos?.oscuro,
  };
  for (const [propiedad, valor] of Object.entries(propiedades)) {
    if (valor) elemento.style.setProperty(propiedad, valor);
    else elemento.style.removeProperty(propiedad);
  }
}
