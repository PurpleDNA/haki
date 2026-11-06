// Builds the Haki logo files (SVG + PNG) and the brand board.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const { chromium } = require('playwright-core');
const { C, baobab, baobabSmall, svg } = require('./marks');

const ROOT = path.join(__dirname, '..');
const LOGO = path.join(ROOT, 'logo');
fs.mkdirSync(path.join(LOGO, 'png'), { recursive: true });
const font = opentype.parse(fs.readFileSync(path.join(ROOT, 'fonts', 'Outfit-600.ttf')).buffer);

// Wordmark "haki" in Outfit SemiBold, outlined, with the dot of the i swapped for a small crown.
const wordmark = (size = 100, tracking = -2) => {
  const scale = size / font.unitsPerEm;
  const p = new opentype.Path();
  let x = 0;
  const glyphs = [...'hak'].map(ch => font.charToGlyph(ch)).concat(font.charToGlyph('ı'));
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(x, size, size));
    const kern = glyphs[i + 1] ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    x += (g.advanceWidth + kern) * scale + tracking;
  });
  const iX = x - glyphs.at(-1).advanceWidth * scale - tracking;
  const stem = glyphs.at(-1).getPath(iX, size, size).getBoundingBox();
  const dot = font.charToGlyph('i').getPath(iX, size, size).getBoundingBox();
  const sw = stem.x2 - stem.x1;
  const pw = sw * 2.1, ph = sw * 1.2;
  const cx = (stem.x1 + stem.x2) / 2, cy = (dot.y1 + Math.min(dot.y2, stem.y1 - sw * 0.35)) / 2 - sw * 0.05;
  const bb = p.getBoundingBox();
  const crown = { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph };
  return {
    body: (fill) => `<path d="${p.toPathData(2)}" fill="${fill}"/><rect x="${crown.x.toFixed(2)}" y="${crown.y.toFixed(2)}" width="${pw.toFixed(2)}" height="${ph.toFixed(2)}" rx="${(ph / 2).toFixed(2)}" fill="${fill}"/>`,
    x1: Math.min(bb.x1, crown.x), y1: Math.min(bb.y1, crown.y), x2: Math.max(bb.x2, crown.x + pw), y2: bb.y2,
    xHeight: font.tables.os2.sxHeight * scale, baseline: size,
  };
};

const W = wordmark();

const file = (name, content) => fs.writeFileSync(path.join(LOGO, name), content.trim() + '\n');
const doc = (vb, inner, bg) => {
  const [x, y, w, h] = vb;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n => n.toFixed(2)).join(' ')}" width="${w.toFixed(0)}" height="${h.toFixed(0)}">${bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`;
};

// Mark scaled so the crown top sits at the wordmark's ascender and the trunk base on the baseline.
const lockupH = (fg, word) => {
  const top = W.y1, base = W.baseline, h = base - top;
  const s = h / (106 - 14), mx = -(120 * s) - h * 0.28;
  const inner = `<g transform="translate(${mx.toFixed(2)} ${(top - 14 * s).toFixed(2)}) scale(${s.toFixed(4)})">${baobab(fg)}</g>${W.body(word)}`;
  const pad = h * 0.3;
  return { inner, vb: [mx + 12 * s - pad, top - pad, W.x2 - (mx + 12 * s) + pad * 2, h + pad * 2] };
};

const lockupV = (fg, word) => {
  const ww = W.x2 - W.x1, s = ww * 0.62 / 96, markH = 92 * s;
  const mx = W.x1 + ww / 2 - 60 * s, my = W.y1 - markH * 1.32 - 14 * s;
  const inner = `<g transform="translate(${mx.toFixed(2)} ${my.toFixed(2)}) scale(${s.toFixed(4)})">${baobab(fg)}</g>${W.body(word)}`;
  const pad = ww * 0.14, y0 = my + 14 * s;
  return { inner, vb: [W.x1 - pad, y0 - pad, ww + pad * 2, W.baseline - y0 + pad * 2] };
};

const variants = {
  'on-dark': { mark: C.lime, word: C.softLime, bg: C.midnight },
  'on-light': { mark: C.midnight, word: C.midnight, bg: C.softLime },
  'black': { mark: C.black, word: C.black, bg: C.white },
  'white': { mark: C.white, word: C.white, bg: C.black },
};

const outputs = [];
for (const [name, v] of Object.entries(variants)) {
  const h = lockupH(v.mark, v.word), s = lockupV(v.mark, v.word);
  file(`haki-lockup-horizontal-${name}.svg`, doc(h.vb, h.inner));
  file(`haki-lockup-stacked-${name}.svg`, doc(s.vb, s.inner));
  file(`haki-mark-${name}.svg`, svg(baobab(v.mark), { size: 512, pad: 0 }).replace(/width="512" height="512"/, 'width="512" height="512"'));
  file(`haki-wordmark-${name}.svg`, doc([W.x1, W.y1, W.x2 - W.x1, W.baseline - W.y1], W.body(v.word)));
  outputs.push([`haki-lockup-horizontal-${name}`, doc(h.vb, h.inner, v.bg), 1600]);
  outputs.push([`haki-lockup-stacked-${name}`, doc(s.vb, s.inner, v.bg), 1200]);
}
const appIcon = svg(baobab(C.lime), { bg: C.midnight, size: 1024, pad: 26, radius: 40 });
const favicon = svg(baobabSmall(C.lime), { bg: C.midnight, size: 64, pad: 10, radius: 30 });
file('haki-app-icon.svg', appIcon);
file('haki-favicon.svg', favicon);
outputs.push(['haki-app-icon', appIcon, 1024], ['haki-favicon-512', favicon, 512]);

// ---------- brand board ----------
const H = lockupH(C.lime, C.softLime), HL = lockupH(C.midnight, C.midnight), V = lockupV(C.lime, C.softLime);
const inline = (o, height, extra = '') => doc(o.vb, o.inner).replace(/width="[^"]*" height="[^"]*"/, `height="${height}" ${extra}`);
const fontCss = `@font-face{font-family:Outfit;src:url(fonts/Outfit-Variable.ttf);font-weight:100 900}`;
const swatch = (name, hex, ink, role) => `<div class="sw" style="background:${hex};color:${ink}"><b>${name}</b><span>${hex.toUpperCase()}</span><em>${role}</em></div>`;

const board = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
*{box-sizing:border-box}body{margin:0;background:${C.softLime};font-family:Outfit,system-ui;color:${C.midnight}}
.page{width:1440px;padding:64px;display:grid;gap:24px;grid-template-columns:repeat(12,1fr)}
.card{border-radius:24px;padding:40px;position:relative;overflow:hidden}
.k{font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;opacity:.7;margin:0 0 20px}
h1{font-size:44px;line-height:1.1;font-weight:600;margin:0 0 16px;letter-spacing:-.02em}
p{font-size:17px;line-height:1.55;margin:0;max-width:52ch}
.hero{grid-column:span 12;background:${C.midnight};color:${C.softLime};height:560px;display:flex;align-items:center;justify-content:center}
.hero .tag{position:absolute;left:40px;bottom:36px;font-size:15px;opacity:.75}
.story{grid-column:span 7;background:${C.white}}
.mark{grid-column:span 5;background:${C.lime};display:flex;align-items:center;justify-content:center}
.lock{grid-column:span 6;display:flex;align-items:center;justify-content:center;height:260px}
.icons{grid-column:span 6;background:${C.pattens};display:flex;gap:32px;align-items:flex-end;justify-content:center;height:260px}
.icons figure{margin:0;text-align:center;font-size:13px;color:${C.slate}}
.colors{grid-column:span 12;display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:12px;padding:0}
.sw{border-radius:20px;height:200px;padding:24px;display:flex;flex-direction:column;gap:4px}
.sw b{font-size:20px;font-weight:600}.sw span{font-size:14px;opacity:.8}.sw em{margin-top:auto;font-style:normal;font-size:13px;opacity:.75}
.type{grid-column:span 7;background:${C.white}}
.type .big{font-size:96px;font-weight:600;letter-spacing:-.03em;line-height:1}
.type .row{display:flex;gap:32px;margin-top:24px;font-size:18px}
.app{grid-column:span 5;background:${C.midnight};color:${C.softLime};padding:0}
.bar{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;border-bottom:1px solid #ffffff1a}
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:24px 28px}
.kpi{background:#ffffff0f;border-radius:16px;padding:18px}.kpi small{opacity:.7;font-size:13px}.kpi div{font-size:26px;font-weight:600;margin-top:6px}
.kpi.hl{background:${C.lime};color:${C.midnight}}
.pill{background:${C.lime};color:${C.midnight};border-radius:99px;padding:8px 16px;font-weight:600;font-size:14px}
.dont{grid-column:span 12;background:${C.white};display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.dont div{text-align:center;font-size:14px}.dont .t{height:120px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
</style></head><body><div class="page">
<section class="card hero">${inline(H, 150)}<div class="tag">haki · Swahili for <i>just</i> · Murabaha asset financing</div></section>
<section class="card story"><p class="k">The idea</p><h1>Justice happens in the open, under the baobab.</h1>
<p>Across Africa, communities settled disputes under a great canopy tree, in full view, together. Haki's mark is that tree. The <b>flat crown</b> is shelter and a level judgement. The <b>branches</b> hold it up for everyone beneath. The <b>broad trunk</b> is steadiness: a fair price, fixed and agreed, that never grows behind your back.</p>
<p style="margin-top:16px">The crown returns as the dot of the <b>i</b> in the wordmark, so the name and the tree read as one.</p></section>
<section class="card mark">${svg(baobab(C.midnight), { size: 300 })}</section>
<section class="card lock" style="background:${C.white}">${inline(HL, 92)}</section>
<section class="card icons">
<figure>${svg(baobab(C.lime), { bg: C.midnight, size: 132, pad: 26, radius: 40 })}<figcaption>App icon</figcaption></figure>
<figure>${svg(baobabSmall(C.lime), { bg: C.midnight, size: 64, pad: 10, radius: 30 })}<figcaption>64 px</figcaption></figure>
<figure>${svg(baobabSmall(C.lime), { bg: C.midnight, size: 32, pad: 10, radius: 30 })}<figcaption>32 px</figcaption></figure>
<figure>${svg(baobabSmall(C.lime), { bg: C.midnight, size: 16, pad: 10, radius: 30 })}<figcaption>16 px</figcaption></figure>
</section>
<section class="colors">
${swatch('Midnight Green', C.midnight, C.softLime, 'Primary · backgrounds, text')}
${swatch('Electric Lime', C.lime, C.midnight, 'Mark, highlights, buttons')}
${swatch('Soft Lime', C.softLime, C.midnight, 'Light backgrounds')}
${swatch('Pattens Blue', C.pattens, C.midnight, 'Cards, info states')}
${swatch('Slate Blue', C.slate, C.white, 'Charts, secondary')}
</section>
<section class="card type"><p class="k">Typeface · Outfit</p><div class="big">Aa Bb 123</div>
<div class="row"><span style="font-weight:600">SemiBold — headings</span><span style="font-weight:500">Medium — labels</span><span style="font-weight:400">Regular — body text</span></div>
<p style="margin-top:20px;font-size:15px;opacity:.75">Free on Google Fonts. Wordmark is outlined from Outfit SemiBold with tightened spacing and the crown as the i's dot.</p></section>
<section class="card app"><div class="bar">${inline(H, 30)}<span class="pill">New financing</span></div>
<div class="kpis"><div class="kpi hl"><small>Active financings</small><div>48</div></div><div class="kpi"><small>Outstanding</small><div>₦62.4m</div></div>
<div class="kpi"><small>Collected this month</small><div>₦8.1m</div></div><div class="kpi"><small>Overdue</small><div>₦1.2m</div></div></div>
<p style="padding:0 28px 24px;font-size:13px;opacity:.6">Illustrative figures</p></section>
<section class="card dont"><p class="k" style="grid-column:span 4;margin:0">Use it well</p>
<div><div class="t" style="background:${C.midnight}">${svg(baobab(C.lime), { size: 80 })}</div>Lime on Midnight — primary</div>
<div><div class="t" style="background:${C.softLime};border:1px solid #0532331a">${svg(baobab(C.midnight), { size: 80 })}</div>Midnight on Soft Lime</div>
<div><div class="t" style="background:${C.slate}">${svg(baobab(C.softLime), { size: 80 })}</div>Soft Lime on Slate — sparingly</div>
<div><div class="t" style="background:${C.lime}">${svg(baobab(C.pattens), { size: 80 })}</div>Never low contrast (e.g. blue on lime)</div>
</section>
</div></body></html>`;
fs.writeFileSync(path.join(ROOT, 'brand-board.html'), board);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  for (const [name, s, px] of outputs) {
    const sized = s.replace(/width="[^"]*" height="[^"]*"/, `width="${px / 2}"`);
    await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
    await (await page.$('svg')).screenshot({ path: path.join(LOGO, 'png', `${name}.png`), omitBackground: true });
  }
  await page.goto('file://' + path.join(ROOT, 'brand-board.html'));
  await page.screenshot({ path: path.join(ROOT, 'brand-board.png'), fullPage: true });
  await browser.close();
})();
