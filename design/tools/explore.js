// Exploration board: three mark concepts + wordmark font tests, rendered to PNG.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const { chromium } = require('playwright-core');
const { C, fan, arms, blocks, svg } = require('./marks');

const FONTS = path.join(__dirname, '..', 'fonts');
const OUT = path.join(__dirname, '..', 'explore');
fs.mkdirSync(OUT, { recursive: true });

const word = (file, text, size, fill, letterSpacing = 0) => {
  const font = opentype.parse(fs.readFileSync(path.join(FONTS, file)).buffer);
  // Lay out glyphs by hand: opentype.js chokes on some fonts' contextual lookups.
  const scale = size / font.unitsPerEm;
  const p = new opentype.Path();
  let x = 0;
  const glyphs = [...text].map(ch => font.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(x, size, size));
    const kern = glyphs[i + 1] ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    x += (g.advanceWidth + kern) * scale + letterSpacing;
  });
  const bb = p.getBoundingBox();
  p.fill = fill;
  return { d: p.toPathData(2), bb };
};

const wordSvg = (file, h) => {
  const w = word(file, 'haki', 100, h);
  const { x1, y1, x2, y2 } = w.bb;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x1 - 4} ${y1 - 4} ${x2 - x1 + 8} ${y2 - y1 + 8}" height="56"><path d="${w.d}" fill="${h}"/></svg>`;
};

const tile = (label, inner, bg) => `<figure style="background:${bg}"><div>${svg(inner, null, 180)}</div><figcaption style="color:${bg === C.midnight ? C.softLime : C.midnight}">${label}</figcaption></figure>`;

const html = `<!doctype html><html><head><style>
body{margin:0;padding:32px;background:#ddd;font:14px system-ui}
.row{display:flex;gap:16px;margin-bottom:16px}
figure{margin:0;width:300px;height:280px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center}
figcaption{margin-top:12px;font-weight:600}
.fonts{display:flex;gap:16px}
.fonts div{background:${C.softLime};padding:24px;border-radius:12px;text-align:center}
</style></head><body>
<div class="row">
${tile('V1 · Gathering baobab', fan(C.lime), C.midnight)}
${tile('V2 · Raised arms', arms(C.lime), C.midnight)}
${tile('V3 · Block crown', blocks(C.lime), C.midnight)}
</div>
<div class="row">
${tile('V1', fan(C.midnight), C.softLime)}
${tile('V2', arms(C.midnight), C.softLime)}
${tile('V3', blocks(C.midnight), C.softLime)}
</div>
<div class="fonts">
<div>${wordSvg('Outfit-600.ttf', C.midnight)}<p>Outfit 600</p></div>
<div>${wordSvg('PlusJakartaSans-600.ttf', C.midnight)}<p>Jakarta 600</p></div>
<div>${wordSvg('PlusJakartaSans-700.ttf', C.midnight)}<p>Jakarta 700</p></div>
</div>
</body></html>`;

(async () => {
  const exe = process.env.CHROME;
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1.5 });
  await page.setContent(html);
  await page.screenshot({ path: path.join(OUT, 'explore.png'), fullPage: true });
  await browser.close();
})();
