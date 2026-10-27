// Uso: node tools/brand-icons.mjs icons   (luego renderiza los PNG desde los SVG).
// Genera los SVG del símbolo de Ritmo: cinco puntos que suben y bajan; el último (hoy) en otro color.
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
// Centros y radios medidos sobre la lámina de marca (unidades de la lámina).
const DOTS = [[0, 64, 24], [86, 27, 24], [172, 49, 24], [258, 0, 24], [338, 32, 29]];
const minX = -24, maxX = 338 + 29, minY = -29, maxY = 64 + 24;
const W = maxX - minX, H = maxY - minY;

function dots(size, span, fill, last, cls = '', grow = 1) {
  const s = (size * span) / W, ox = (size - W * s) / 2 - minX * s, oy = (size - H * s) / 2 - minY * s;
  return DOTS.map(([x, y, r], i) => {
    const c = `cx="${(ox + x * s).toFixed(1)}" cy="${(oy + y * s).toFixed(1)}" r="${(r * s * grow).toFixed(1)}"`;
    return i === 4 ? `<circle class="last${cls}" ${c} fill="${last}"/>` : `<circle class="dot${cls}" ${c} fill="${fill}"/>`;
  }).join('');
}
const CLAY = '#c67139', ARENA = '#f5ead8', INK = '#201e1d', CLAY_DEEP = '#402310', CLAY_LIGHT = '#f6a06b';
const svg = (size, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${extra}${body}</svg>\n`;

// Icono principal: tesela de tinta redondeada (versión negra de la lámina de marca).
writeFileSync(`${out}/icon.svg`, svg(512, `<rect width="512" height="512" rx="116" fill="${INK}"/>` + dots(512, .70, ARENA, CLAY_LIGHT)));
// Maskable y Apple: a sangre (el sistema recorta), con el símbolo dentro de la zona segura.
writeFileSync(`${out}/icon-maskable.svg`, svg(512, `<rect width="512" height="512" fill="${INK}"/>` + dots(512, .60, ARENA, CLAY_LIGHT)));
writeFileSync(`${out}/apple-touch-icon.svg`, svg(512, `<rect width="512" height="512" fill="${INK}"/>` + dots(512, .68, ARENA, CLAY_LIGHT)));
// Favicon: misma tesela de tinta, con puntos más grandes para que se lean a 16–32 px.
writeFileSync(`${out}/favicon.svg`, svg(64,
  `<rect width="64" height="64" rx="15" fill="${INK}"/>` + dots(64, .80, ARENA, CLAY_LIGHT, '', 1.3)));
// Símbolo suelto para la barra superior (tinta + arcilla), recortado a su caja.
writeFileSync(`${out}/mark.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${W} ${H}">` +
  DOTS.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i === 4 ? CLAY : INK}"/>`).join('') + '</svg>\n');
console.log('viewBox', minX, minY, W, H);
