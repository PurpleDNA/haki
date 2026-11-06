// Haki logo mark: a baobab, the tree communities met under to settle disputes openly.
// Flat crown = shelter and level judgement; branches lift it; a broad trunk = steadiness.
// Drawn on a 120x120 grid.
const C = {
  midnight: '#053233',
  softLime: '#f8ffe1',
  lime: '#e2f4a2',
  pattens: '#e9efff',
  slate: '#7789b7',
  white: '#ffffff',
  black: '#000000',
};

const baobab = (fg) => `<g fill="${fg}">
  <rect x="12" y="14" width="96" height="26" rx="13"/>
  <g stroke="${fg}" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M57 82 L30 50"/><path d="M57 74 L48 50"/><path d="M63 74 L72 50"/><path d="M63 82 L90 50"/>
  </g>
  <path d="M45 72 H75 C75 86 81 97 88 106 H32 C39 97 45 86 45 72 Z" stroke="${fg}" stroke-width="4" stroke-linejoin="round"/>
</g>`;

// Small-size cut for favicons: fewer, thicker branches so it holds at 16px.
const baobabSmall = (fg) => `<g fill="${fg}">
  <rect x="10" y="12" width="100" height="30" rx="15"/>
  <g stroke="${fg}" stroke-width="14" stroke-linecap="round" fill="none">
    <path d="M54 78 L32 54"/><path d="M66 78 L88 54"/>
  </g>
  <path d="M44 72 H76 C76 86 82 97 90 108 H30 C38 97 44 86 44 72 Z" stroke="${fg}" stroke-width="4" stroke-linejoin="round"/>
</g>`;

const svg = (inner, { bg, size = 120, pad = 0, radius = 0 } = {}) => {
  const v = 120 + pad * 2;
  const back = bg ? `<rect x="${-pad}" y="${-pad}" width="${v}" height="${v}" rx="${radius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${v} ${v}" width="${size}" height="${size}">${back}${inner}</svg>`;
};

module.exports = { C, baobab, baobabSmall, svg };
