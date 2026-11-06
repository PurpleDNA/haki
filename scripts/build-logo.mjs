// Redraws the client's logo as a vector with the wordmark reading "Haki" only.
import fs from 'node:fs';
import opentype from 'opentype.js';
import { chromium } from 'playwright-core';

const font = opentype.parse(fs.readFileSync('node_modules/@fontsource/arimo/files/arimo-latin-700-normal.woff').buffer);
const size = 150;
const adv = font.getAdvanceWidth('Haki', size);
const cx = 532;
const baseline = 905;
const word = font.getPath('Haki', cx - adv / 2, baseline, size).toPathData(2);
const barY = baseline + 34;
const gap = 18;
const barW = (adv - gap) / 2;

const defs = `<defs>
<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00ada5"/><stop offset="1" stop-color="#005b5e"/></linearGradient>
<linearGradient id="r" gradientUnits="userSpaceOnUse" x1="250" y1="420" x2="815" y2="420"><stop offset="0" stop-color="#00b3aa"/><stop offset="1" stop-color="#005b5e"/></linearGradient>
</defs>`;
const mark = `<circle cx="531" cy="408" r="226" fill="url(#d)"/>
<path fill="#fff" d="M250 272 362 268 366 360 470 355 466 255 523 252 533 607 477 609 472 402 368 406 373 525 250 531Z"/>
<path fill="none" stroke="url(#r)" stroke-width="31" d="M808 420A275 275 0 1 0 528 695"/><circle cx="808" cy="420" r="15.5" fill="#005f62"/>
<path fill="#00a39b" d="M514 651 643 672 538 750 545 711 533 680Z"/>
<g fill="#fff"><path d="M551 487h20v5h-20zM586 473h20v19h-20zM620 451h20v41h-20zM654 424h20v68h-20zM689 399h20v93h-20z"/>
<path fill="none" stroke="#fff" stroke-width="7" d="M546 472C610 448 660 410 687 358"/><path d="M697 344 676 352 691 366Z"/></g>
<g fill="#00686a"><circle cx="790" cy="520" r="16"/><circle cx="749" cy="592" r="16"/><circle cx="688" cy="647" r="16"/></g>`;
const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="215 110 640 ${barY + 40 - 110}" role="img" aria-label="Haki">${defs}${mark}
<path fill="#0a0a0a" d="${word}"/>
<rect x="${(cx - adv / 2).toFixed(1)}" y="${barY}" width="${barW.toFixed(1)}" height="22" rx="11" fill="#00938c"/>
<rect x="${(cx - adv / 2 + barW + gap).toFixed(1)}" y="${barY}" width="${barW.toFixed(1)}" height="22" rx="11" fill="#0a0a0a"/></svg>\n`;
fs.writeFileSync('public/haki-logo.svg', lockup);

// The browser tab icon has no room for the wordmark.
fs.mkdirSync('src/app', { recursive: true });
fs.writeFileSync('src/app/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="225 120 610 640">${defs}<rect x="225" y="120" width="610" height="640" fill="#fff"/>${mark}</svg>\n`);

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 640, height: 830 }, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0;background:#fff">${lockup}</body>`);
await (await page.$('svg')).screenshot({ path: 'src/assets/haki-logo.png' });
await browser.close();
