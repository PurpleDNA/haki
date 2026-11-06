// Haki UI mockups: the 5 pages from the PRD, written as static HTML and rendered to PNG.
// Sample data only. Run: CHROME=... node screens.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { C, baobab } = require('./marks');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screens');
const logo = (variant, h) => fs.readFileSync(path.join(ROOT, 'logo', `haki-lockup-horizontal-${variant}.svg`), 'utf8')
  .replace(/width="[^"]*" height="[^"]*"/, `height="${h}"`);
const mark = (fg, s) => `<svg viewBox="0 0 120 120" width="${s}" height="${s}">${baobab(fg)}</svg>`;

const naira = n => '₦' + Math.round(n).toLocaleString('en-NG');
const M = n => '₦' + n.toFixed(1) + 'M';

// Chart series colours: brand-derived steps that pass the dataviz validator on white.
const S = { collect: '#00876c', disburse: '#6a80d8' };
// Status colours are functional only, always paired with a label.
const ST = {
  paid: ['#e3f3ec', '#0b6b4f', 'Paid'],
  due: ['#fff2d6', '#8a5a00', 'Due'],
  part: ['#fff2d6', '#8a5a00', 'Part-paid'],
  overdue: ['#fde7e2', '#a83420', 'Overdue'],
  upcoming: [C.pattens, '#45568a', 'Upcoming'],
  active: ['#e3f3ec', '#0b6b4f', 'Active'],
  review: [C.pattens, '#45568a', 'Under review'],
  applied: ['#f1f3f5', '#4a5560', 'New application'],
  sent: ['#efeaff', '#5a45a8', 'Agreement sent'],
  completed: ['#eef0f2', '#3d4650', 'Completed'],
  declined: ['#f4f4f4', '#6b6b6b', 'Declined'],
};
const icon = { paid: '✓', active: '●', overdue: '!', due: '◷', part: '◐', upcoming: '○', review: '◔', applied: '+', sent: '✉', completed: '✓', declined: '×' };
const pill = (k, label) => `<span class="pill" style="background:${ST[k][0]};color:${ST[k][1]}"><i>${icon[k]}</i>${label || ST[k][2]}</span>`;

const css = `
@font-face{font-family:Outfit;src:url(../fonts/Outfit-Variable.ttf);font-weight:100 900}
@font-face{font-family:Manrope;src:url(../fonts/Manrope-Variable.ttf);font-weight:200 800}
:root{--mid:${C.midnight};--soft:${C.softLime};--lime:${C.lime};--pat:${C.pattens};--slate:${C.slate};
--ink:#0d1f20;--ink2:#4b5d5e;--ink3:#7d8c8d;--line:#e4e9e6;--bg:#f6f8f3}
*{box-sizing:border-box}
body{margin:0;font-family:Manrope,system-ui;color:var(--ink);font-size:14px;background:var(--bg);font-feature-settings:"tnum"}
h1,h2,h3,.disp{font-family:Outfit;font-weight:600;letter-spacing:-.01em;margin:0}
.num{font-variant-numeric:tabular-nums}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 8px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}
.pill i{font-style:normal;font-size:11px}
.btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px;border-radius:10px;font:600 14px Manrope;border:1px solid var(--line);background:#fff;color:var(--ink)}
.btn.pri{background:var(--mid);color:var(--soft);border-color:var(--mid)}
.btn.lime{background:var(--lime);color:var(--mid);border-color:var(--lime)}
.card{background:#fff;border:1px solid var(--line);border-radius:16px}
.muted{color:var(--ink3)} .ink2{color:var(--ink2)}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--ink)}
.field{height:46px;border:1px solid #d5dcd8;border-radius:10px;padding:0 14px;display:flex;align-items:center;background:#fff;font-size:15px;justify-content:space-between}
.hint{font-size:12px;color:var(--ink3);margin-top:6px}
table{border-collapse:collapse;width:100%}
th{font-size:12px;font-weight:600;color:var(--ink3);text-align:left;padding:10px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:13px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
td.r,th.r{text-align:right}
tr:last-child td{border-bottom:0}

/* staff shell: slim icon rail */
.shell{display:grid;grid-template-columns:84px 1fr;min-height:100vh}
.rail{background:var(--mid);display:flex;flex-direction:column;align-items:center;padding:24px 0;gap:10px}
.rail .mk{margin-bottom:26px}
.ri{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#8fb0a6;position:relative}
.ri svg{width:21px;height:21px}
.ri.on{background:var(--lime);color:var(--mid)}
.ri .dot{position:absolute;top:9px;right:9px;width:8px;height:8px;border-radius:50%;background:var(--lime);box-shadow:0 0 0 2px var(--mid)}
.ri.on .dot{background:var(--mid);box-shadow:0 0 0 2px var(--lime)}
.rail .end{margin-top:auto;display:flex;flex-direction:column;gap:10px;align-items:center}
.ava{width:38px;height:38px;border-radius:50%;background:var(--slate);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
.main{padding:30px 44px 56px;min-width:0}
.top{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.top h1{font-size:28px}
.top .sub{color:var(--ink3);margin-top:4px;font-size:14px}
.top .sp{flex:1}
.search{width:280px;height:44px;border:1px solid var(--line);background:#fff;border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--ink3)}
.ib{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;color:var(--ink2)}
.ib svg{width:19px;height:19px}
.seg{display:inline-flex;background:#f0f3ee;border-radius:12px;padding:4px}
.seg span{padding:8px 14px;border-radius:9px;font-weight:600;font-size:13px;color:var(--ink2)}
.seg span.on{background:#fff;color:var(--mid);box-shadow:0 1px 3px rgba(5,50,51,.12)}
`;

const ic = (d, sw = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  dash: ic('<rect x="3" y="3" width="7.5" height="9" rx="2"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2"/><rect x="3" y="15" width="7.5" height="6" rx="2"/>'),
  fin: ic('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>'),
  gear: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 1.6),
  out: ic('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'),
  search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bell: ic('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  link: ic('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  wallet: ic('<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="16.5" cy="13.5" r="1.3"/>'),
  inflow: ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  alert: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.3v.2"/>'),
  more: ic('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', 2.4),
  back: ic('<path d="M15 18l-6-6 6-6"/>'),
  car: ic('<path d="M5 16H3v-4l2-5h14l2 5v4h-2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5M3 12h18"/>'),
  tool: ic('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'),
  phone: ic('<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  bolt: ic('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.2),
  x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  up: ic('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
};
const shell = (active, body) => `<div class="shell"><aside class="rail">
<div class="mk">${mark(C.lime, 40)}</div>
<div class="ri ${active === 'dash' ? 'on' : ''}">${I.dash}</div>
<div class="ri ${active === 'fin' ? 'on' : ''}">${I.fin}<span class="dot"></span></div>
<div class="end"><div class="ri">${I.gear}</div><div class="ri">${I.out}</div><div class="ava" style="margin-top:8px">AO</div></div>
</aside><main class="main">${body}</main></div>`;

const page = (title, body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Haki</title><style>${css}${extra}</style></head><body>${body}</body></html>`;

// ---------- 1. Application form (step 4 of 5) ----------
const steps = ['Personal details', 'Work and income', 'Asset to finance', 'Payment plan', 'Guarantor and review'];
const formCss = `
.apply{display:grid;grid-template-columns:420px 1fr;min-height:100vh}
.panel{background:var(--mid);color:var(--soft);padding:40px 44px;display:flex;flex-direction:column}
.panel h1{font-size:40px;line-height:1.08;margin:56px 0 14px;color:var(--soft)}
.panel p.lead{color:#b9cfc6;font-size:15px;line-height:1.55;margin:0 0 40px}
.steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.steps li{display:flex;align-items:center;gap:14px;padding:10px 0;color:#7fa39a;font-weight:600}
.steps li .n{width:30px;height:30px;border-radius:50%;border:1.5px solid #2c6264;display:grid;place-items:center;font-size:13px}
.steps li.done{color:#cfe0d8}.steps li.done .n{background:#0f4a4b;border-color:#0f4a4b;color:var(--lime)}
.steps li.on{color:var(--soft)}.steps li.on .n{background:var(--lime);border-color:var(--lime);color:var(--mid)}
.how{margin-top:auto;background:#0b3f40;border-radius:16px;padding:20px 22px}
.how h3{font-size:15px;color:var(--lime);margin-bottom:12px}
.how ol{margin:0;padding-left:18px;color:#cfe0d8;line-height:1.75;font-size:13.5px}
.formside{padding:40px 72px;display:flex;flex-direction:column;max-width:860px}
.prog{display:flex;align-items:center;gap:16px;font-size:13px;color:var(--ink3);font-weight:600}
.bar{flex:1;height:6px;background:#e3e9e4;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;width:80%;background:var(--mid);border-radius:99px}
.formside h2{font-size:32px;margin:36px 0 8px}
.recap{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;background:var(--pat);margin:24px 0 28px}
.recap .ic{width:42px;height:42px;border-radius:10px;background:#fff;display:grid;place-items:center}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.tenor{display:flex;gap:8px}.tenor span{flex:1;height:46px;border:1px solid #d5dcd8;border-radius:10px;display:grid;place-items:center;font-weight:600;background:#fff}
.tenor span.on{background:var(--mid);color:var(--soft);border-color:var(--mid)}
.est{margin-top:28px;background:var(--lime);border-radius:18px;padding:24px 26px;display:grid;grid-template-columns:1fr auto;gap:8px 24px;align-items:end}
.est .big{font-family:Outfit;font-weight:600;font-size:44px;color:var(--mid);letter-spacing:-.02em;line-height:1}
.est .big small{font-size:18px;font-weight:500}
.est dl{margin:0;display:grid;grid-template-columns:auto auto;gap:4px 18px;font-size:13px;color:#2d4f45}
.est dd{margin:0;text-align:right;font-weight:700;color:var(--mid)}
.est p{grid-column:1/-1;margin:10px 0 0;font-size:12.5px;color:#3d5c52}
.actions{display:flex;align-items:center;gap:12px;margin-top:36px;padding-top:24px;border-top:1px solid var(--line)}
.saved{margin-right:auto;font-size:12.5px;color:var(--ink3);display:flex;align-items:center;gap:6px}
.mtop{display:none}
@media(max-width:700px){
 .apply{grid-template-columns:1fr}.panel{display:none}
 .mtop{display:flex;align-items:center;justify-content:space-between;background:var(--mid);padding:16px 20px;color:#b9cfc6;font-size:13px;font-weight:600}
 .formside{padding:24px 20px}.formside h2{font-size:26px;margin-top:22px}
 .grid2{grid-template-columns:1fr;gap:18px}.tenor{flex-wrap:wrap}.tenor span{flex:0 0 calc(33.3% - 6px)}
 .est{grid-template-columns:1fr}.est .big{font-size:38px}
 .actions{flex-wrap:wrap}.saved{width:100%;margin-bottom:6px}.actions .btn{flex:1;justify-content:center}
}`;
const carIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C.midnight}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16H3v-4l2-5h14l2 5v4h-2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5M3 12h18"/></svg>`;
const apply = page('Apply', `<div class="mtop">${logo('on-dark', 26)}<span>Need help? Call us</span></div><div class="apply">
<section class="panel">${logo('on-dark', 40)}
<h1>Finance what you need, at a price that never grows.</h1>
<p class="lead">We buy the asset for you, then sell it to you at one fixed price you agree to upfront. No interest, ever.</p>
<ol class="steps">${steps.map((s, i) => `<li class="${i < 3 ? 'done' : i === 3 ? 'on' : ''}"><span class="n">${i < 3 ? '✓' : i + 1}</span>${s}</li>`).join('')}</ol>
<div class="how"><h3>How it works</h3><ol><li>Tell us what you want to buy and from whom</li><li>We check it and buy it from the vendor</li><li>You pay us back in fixed monthly instalments</li></ol></div>
</section>
<section class="formside">
<div class="prog">Step 4 of 5<div class="bar"><i></i></div>80%</div>
<h2>Your payment plan</h2>
<p class="ink2" style="margin:0;font-size:15px">Choose what you can put down and how long you'd like to pay.</p>
<div class="recap"><div class="ic">${carIcon}</div><div><div style="font-weight:700">2019 Toyota Corolla LE</div><div class="muted" style="font-size:13px">From Prestige Motors, Ikeja · Quoted at ${naira(8000000)}</div></div><span style="margin-left:auto;font-weight:600;color:#45568a;font-size:13px">Edit</span></div>
<div class="grid2">
<div><label>Down payment</label><div class="field"><span>₦ 2,000,000</span><span class="muted" style="font-size:13px">25%</span></div><div class="hint">At least 20% of the quoted price</div></div>
<div><label>Preferred payment day</label><div class="field"><span>28th of each month</span><span class="muted">▾</span></div><div class="hint">Pick a day just after you get paid</div></div>
</div>
<div style="margin-top:22px"><label>How many months?</label><div class="tenor">${[3, 6, 9, 12, 18, 24].map(m => `<span class="${m === 12 ? 'on' : ''}">${m}</span>`).join('')}</div></div>
<div class="est"><div><div style="font-size:13px;font-weight:600;color:#2d4f45;margin-bottom:8px">Estimated monthly instalment</div><div class="big">${naira(600000)}<small> / month</small></div></div>
<dl><dt>Asset price</dt><dd>${naira(8000000)}</dd><dt>Our profit (fixed)</dt><dd>${naira(1200000)}</dd><dt>Total you pay</dt><dd>${naira(9200000)}</dd></dl>
<p>This is an estimate. We'll confirm the exact price after we verify the vendor's quote, and it won't change after you accept.</p></div>
<div class="actions"><span class="saved">✓ Progress saved on this device</span><span class="btn">Back</span><span class="btn pri">Continue →</span></div>
</section></div>`, formCss);

// ---------- 2. Dashboard ----------
const m12 = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const coll12 = [5.2, 5.9, 6.1, 6.8, 7.4, 7.9, 8.1, 9.0, 10.4, 11.2, 12.9, 13.6];

// One chart, one series: soft full-height tracks behind slim midnight bars, current month called out.
const barChart = () => {
  const W = 820, H = 270, l = 40, b = 30, t = 46, max = 16;
  const y = v => t + (H - t - b) * (1 - v / max);
  const gw = (W - l) / 12, bw = 30;
  let g = '';
  [0, 4, 8, 12, 16].forEach(v => { g += `<text x="${l - 12}" y="${y(v) + 4}" text-anchor="end" class="ax">${v}M</text>`; });
  m12.forEach((m, i) => {
    const x = l + gw * i + (gw - bw) / 2, last = i === 11;
    g += `<rect x="${x}" y="${y(max)}" width="${bw}" height="${y(0) - y(max)}" rx="10" fill="#f1f4ee"/>`;
    g += `<rect class="hit" data-tip="${m} · ${M(coll12[i])} collected" x="${x}" y="${y(coll12[i])}" width="${bw}" height="${y(0) - y(coll12[i])}" rx="10" fill="${last ? C.midnight : '#b9c8d9'}"/>`;
    g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="ax" ${last ? 'style="fill:var(--ink);font-weight:700"' : ''}>${m}</text>`;
  });
  const lx = l + gw * 11 + gw / 2, ly = y(coll12[11]);
  g += `<g transform="translate(${lx - 128} 0)"><rect width="112" height="40" rx="10" fill="#fff" stroke="${'#e4e9e6'}"/><text x="12" y="16" class="ax">October</text><text x="12" y="32" class="dl">${M(13.6)}</text><text x="100" y="32" text-anchor="end" style="font:700 11px Manrope;fill:#0b6b4f">+5%</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
};
const dashCss = `
.dgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px}
.kpi{padding:22px 24px;border-radius:20px;border:0;box-shadow:0 1px 2px rgba(5,50,51,.04)}
.kpi .ico{width:42px;height:42px;border-radius:12px;background:var(--pat);color:#45568a;display:grid;place-items:center;margin-bottom:22px}
.kpi .ico svg{width:20px;height:20px}
.kpi .v{font-family:Outfit;font-size:32px;font-weight:600;letter-spacing:-.02em}
.kpi .l{font-size:13.5px;color:var(--ink3);margin-top:6px}
.kpi .tag{float:right;font-size:12px;font-weight:700}
.card{border:0;border-radius:20px;box-shadow:0 1px 2px rgba(5,50,51,.04)}
.card .hd{display:flex;align-items:center;gap:12px;padding:22px 24px 0}
.card .hd h3{font-size:18px}
.card .hd .sp{flex:1}
.ax{font:500 11.5px Manrope;fill:var(--ink3)} .dl{font:700 13px Manrope;fill:var(--ink)}
.dd{height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink2)}
.cb{padding:8px 24px 18px}
.big{display:flex;align-items:baseline;gap:10px;padding:16px 24px 0}
.big b{font-family:Outfit;font-size:30px;font-weight:600;letter-spacing:-.02em}
.big span{color:var(--ink3);font-size:13.5px}
.li{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f0f2ef}
.li:last-child{border:0}
.li .ini{width:40px;height:40px;border-radius:12px;background:#f1f4ee;display:grid;place-items:center;font-weight:700;font-size:13px;color:var(--mid)}
.li .ini svg{width:19px;height:19px}
.li .t{flex:1;min-width:0}.li .t b{display:block;font-weight:700}.li .t small{color:var(--ink3);font-size:12.5px}
.li .a{text-align:right}.li .a b{display:block}.li .a small{font-size:12px;font-weight:700}
.dark{background:var(--mid);color:var(--soft);border-radius:22px;padding:26px}
.dark .k{font-size:13px;color:#9fbcb2;font-weight:600}
.dark .n{font-family:Outfit;font-size:40px;font-weight:600;margin:6px 0 2px;letter-spacing:-.02em}
.track{height:10px;border-radius:99px;background:#0f4a4b;margin:22px 0 10px;overflow:hidden}.track i{display:block;height:100%;width:89%;background:var(--lime);border-radius:99px}
.dark .row2{display:flex;justify-content:space-between;font-size:13px;color:#cfe0d8}
.dark .btn{width:100%;justify-content:center;margin-top:22px;background:var(--soft);color:var(--mid);border:0;height:46px;border-radius:12px}
.rcard{padding:22px 24px;margin-top:20px}
.rcard h3{font-size:18px;display:flex;justify-content:space-between;align-items:baseline}
.rcard h3 span{font:600 13px Manrope;color:var(--ink3)}
.late{color:#a83420}
#tip{position:fixed;pointer-events:none;background:var(--mid);color:var(--soft);font:600 12px Manrope;padding:6px 10px;border-radius:8px;opacity:0;transition:opacity .1s}
.hit{cursor:pointer}.hit:hover{opacity:.85}`;
const tipJs = `<div id="tip"></div><script>const t=document.getElementById('tip');document.querySelectorAll('.hit').forEach(e=>{e.addEventListener('mousemove',v=>{t.textContent=e.dataset.tip;t.style.opacity=1;t.style.left=v.clientX+12+'px';t.style.top=v.clientY-34+'px'});e.addEventListener('mouseleave',()=>t.style.opacity=0)})</script>`;
const initials = n => n.split(' ').map(w => w[0]).join('');
const overdue = [['Emeka Nwosu', 'Tricycle (Keke)', 41, 310000], ['Chinedu Okafor', 'Toyota Corolla', 26, 250000], ['Musa Danjuma', 'Chest freezer', 12, 95000], ['Kemi Balogun', 'iPhone 15 Pro', 5, 64000]];
const dueSoon = [['Aisha Bello', I.bolt, 'Mon 26 Oct', 145000], ['Chinedu Okafor', I.car, 'Wed 28 Oct', 600000], ['Halima Sani', I.tool, 'Wed 28 Oct', 88000], ['Tunde Adeyemi', I.phone, 'Fri 30 Oct', 72500]];
const dash = page('Dashboard', shell('dash', `
<div class="top"><div><h1>Good morning, Amina</h1><div class="sub">Here's how the book looks today, Saturday 24 October.</div></div><span class="sp"></span>
<div class="search">${I.search.replace('<svg', '<svg width="18" height="18"')}Search financings</div><span class="btn" style="height:44px;border-radius:12px">${I.link.replace('<svg', '<svg width="17" height="17"')}Copy apply link</span><div class="ib">${I.bell}</div></div>
<div class="dgrid"><div>
<div class="kpis">
<div class="card kpi"><div class="ico">${I.wallet}</div><div class="v num">₦95.1M</div><div class="l">Outstanding across 38 financings</div></div>
<div class="card kpi"><div class="ico" style="background:#e3f3ec;color:#0b6b4f">${I.inflow}</div><div class="v num">₦13.6M</div><div class="l">Collected in October <span class="tag" style="color:#0b6b4f">+5%</span></div></div>
<div class="card kpi"><div class="ico" style="background:#fde7e2;color:#a83420">${I.alert}</div><div class="v num">₦3.2M</div><div class="l">Overdue on 5 financings</div></div>
</div>
<div class="card"><div class="hd"><div class="seg"><span class="on">Collections</span><span>Disbursements</span><span>On-time rate</span></div><span class="sp"></span><span class="dd">Last 12 months ▾</span></div>
<div class="big"><b class="num">₦104.5M</b><span>collected in the last 12 months</span></div>
<div class="cb">${barChart()}</div></div>
<div class="card" style="margin-top:24px"><div class="hd"><h3>Needs attention</h3><span class="sp"></span><div class="seg"><span class="on">Overdue · 5</span><span>New applications · 4</span></div></div>
<div class="cb" style="padding-top:6px">${overdue.map(([n, a, d, v]) => `<div class="li"><div class="ini">${initials(n)}</div><div class="t"><b>${n}</b><small>${a}</small></div><div class="a"><b class="num">${naira(v)}</b><small class="late">${d} days late</small></div></div>`).join('')}</div></div>
</div>
<aside>
<div class="dark"><div class="k">Active financings</div><div class="n num">38</div><div style="font-size:13px;color:#9fbcb2">₦142.6M financed to date</div>
<div class="track"><i></i></div><div class="row2"><span>On-time collection</span><b style="color:var(--lime)">89%</b></div>
<span class="btn">View all financings</span></div>
<div class="card rcard"><h3>Due this week <span class="num">${naira(905500)}</span></h3>
${dueSoon.map(([n, icn, d, v]) => `<div class="li"><div class="ini">${icn}</div><div class="t"><b>${n}</b><small>${d}</small></div><div class="a"><b class="num">${naira(v)}</b></div></div>`).join('')}</div>
</aside></div>${tipJs}`), dashCss);


// ---------- 3. Financings list ----------
const rows = [
  ['MF-2026-0042', 'Zainab Abdullahi', 'Grinding mill', 1450000, 'applied', '—', null, 0],
  ['MF-2026-0041', 'Ibrahim Musa', 'Honda Accord 2017', 9800000, 'review', '—', null, 0],
  ['MF-2026-0039', 'Ngozi Eze', 'POS terminals ×4', 620000, 'sent', '—', null, 0],
  ['MF-2026-0035', 'Tunde Adeyemi', 'HP EliteBook laptop', 870000, 'active', '30 Oct', 652500, 0],
  ['MF-2026-0031', 'Chinedu Okafor', 'Toyota Corolla 2019', 8000000, 'active', '28 Sep', 3850000, 26],
  ['MF-2026-0029', 'Kemi Balogun', 'iPhone 15 Pro', 1280000, 'active', '19 Oct', 832000, 5],
  ['MF-2026-0027', 'Halima Sani', 'Industrial sewing machines', 1050000, 'active', '28 Oct', 528000, 0],
  ['MF-2026-0022', 'Musa Danjuma', 'Chest freezer', 760000, 'active', '12 Oct', 380000, 12],
  ['MF-2026-0018', 'Aisha Bello', '7.5kVA generator', 1740000, 'active', '26 Oct', 870000, 0],
  ['MF-2026-0014', 'Usman Garba', 'Toyota Hiace bus', 14500000, 'active', '05 Nov', 9960000, 0],
  ['MF-2026-0011', 'Fatima Yusuf', 'Solar inverter kit', 2300000, 'completed', '—', 0, 0],
  ['MF-2026-0009', 'Emeka Nwosu', 'Tricycle (Keke)', 2600000, 'active', '13 Sep', 1240000, 41],
];
const listCss = `
.chips{display:flex;gap:8px;margin-bottom:16px;align-items:center}
.chip{padding:8px 14px;border-radius:99px;background:#fff;border:1px solid var(--line);font-weight:600;font-size:13px;color:var(--ink2)}
.chip b{margin-left:6px;color:var(--ink3);font-weight:600}
.chip.on{background:var(--mid);color:var(--soft);border-color:var(--mid)}.chip.on b{color:var(--lime)}
.chip.warn{color:#a83420}
.filters{display:flex;gap:10px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}
.dd{height:38px;border:1px solid var(--line);border-radius:9px;padding:0 12px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--ink2);background:#fff}
.tog{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink2);margin-left:6px}
.tog i{width:34px;height:20px;border-radius:99px;background:#d5dcd8;position:relative}.tog i:after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff}
.ref{font-weight:700;color:var(--mid)}
tbody tr:hover td{background:#fafcf6}
tr.sel td{background:#f7fbe9}
.late{color:#a83420;font-weight:700}
.pg{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid var(--line);font-size:13px;color:var(--ink3)}
.pg span.p{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:8px;font-weight:700;color:var(--ink2)}.pg span.p.on{background:var(--mid);color:var(--soft)}`;
const list = page('Financings', shell('fin', `
<div class="top"><h1>Financings</h1><span class="sp"></span><div class="search">⌕ Search by name, reference or phone</div><span class="btn">⤓ Export</span></div>
<div class="chips"><span class="chip on">All<b>79</b></span><span class="chip">Applications<b>13</b></span><span class="chip">Active<b>38</b></span><span class="chip warn">Overdue<b>5</b></span><span class="chip">Completed<b>21</b></span><span class="chip">Declined<b>7</b></span></div>
<div class="card" style="overflow:hidden">
<div class="filters"><span class="dd">Asset type: All ▾</span><span class="dd">Applied: 1 May – 24 Oct 2026 ▾</span><span class="tog"><i></i>Overdue only</span><span style="flex:1"></span><span class="muted" style="font-size:13px">Showing 12 of 79</span></div>
<table><thead><tr><th>Reference</th><th>Borrower</th><th>Asset</th><th class="r">Financed (cost)</th><th>Status</th><th>Next due</th><th class="r">Balance</th><th class="r">Days overdue</th></tr></thead>
<tbody>${rows.map(([r, n, a, c, s, d, b, o]) => `<tr class="${r === 'MF-2026-0031' ? 'sel' : ''}"><td class="ref">${r}</td><td><b>${n}</b></td><td class="ink2">${a}</td><td class="r num">${naira(c)}</td><td>${o ? pill('overdue', 'Overdue') : pill(s)}</td><td class="${o ? 'late' : ''}">${d}</td><td class="r num">${b === null ? '<span class="muted">—</span>' : naira(b)}</td><td class="r">${o ? `<span class="late">${o}</span>` : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table>
<div class="pg"><span>Rows per page: 12 ▾</span><span><span class="p on">1</span><span class="p">2</span><span class="p">3</span><span class="p">…</span><span class="p">7</span></span></div>
</div>`), listCss);

// ---------- 4. Financing detail (payment plan tab) ----------
const sched = [];
const mn = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
for (let i = 0; i < 12; i++) {
  const yr = i < 9 ? 2026 : 2027;
  const paid = i < 5 ? 600000 : i === 5 ? 350000 : 0;
  const st = i < 5 ? 'paid' : i === 5 ? 'overdue' : i === 6 ? 'due' : 'upcoming';
  sched.push([i + 1, `28 ${mn[i]} ${yr}`, 600000, paid, st]);
}
const detCss = dashCss + `
.crumb{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;color:var(--ink3);font-weight:600;margin-bottom:22px}
.crumb svg{width:16px;height:16px}
.dhead{display:flex;align-items:center;gap:18px;margin-bottom:26px}
.bigava{width:60px;height:60px;border-radius:18px;background:var(--lime);color:var(--mid);display:grid;place-items:center;font:600 22px Outfit}
.dhead h1{font-size:30px}
.dhead .meta{color:var(--ink3);margin-top:4px;font-size:14px;display:flex;gap:10px;align-items:center}
.tabs{display:flex;gap:28px;border-bottom:1px solid var(--line);margin-bottom:28px}
.tabs span{padding:0 0 14px;font-weight:600;color:var(--ink3);border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs span.on{color:var(--mid);border-color:var(--mid)}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
.hero{padding:28px 30px}
.hero .k{font-size:13.5px;color:var(--ink3);font-weight:600}
.hero .n{font-family:Outfit;font-size:46px;font-weight:600;letter-spacing:-.02em;margin:6px 0 0}
.hero .n small{font:500 15px Manrope;color:var(--ink3);letter-spacing:0;margin-left:8px}
.pbar{height:10px;border-radius:99px;background:#f0f3ee;margin:24px 0 10px;overflow:hidden}.pbar i{display:block;height:100%;width:58%;background:var(--mid);border-radius:99px}
.pl{display:flex;justify-content:space-between;font-size:13px;color:var(--ink3)}
.facts{display:grid;grid-template-columns:repeat(3,1fr);margin-top:26px;padding-top:22px;border-top:1px solid #f0f2ef}
.facts>div{padding-right:16px}.facts>div+div{padding-left:22px;border-left:1px solid #f0f2ef}
.facts .k{font-size:12.5px}.facts b{display:block;font-size:17px;margin-top:6px}
.sched{margin-top:24px;padding:8px 26px 10px}
.sched .hd{padding:16px 0 6px}
.in{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid #f0f2ef}
.in:last-child{border:0}
.in .c{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;background:#f1f4ee;color:var(--ink2)}
.in .c svg{width:16px;height:16px}
.in .t{flex:1}.in .t b{display:block}.in .t small{color:var(--ink3);font-size:12.5px}
.in .a{text-align:right}.in .a b{display:block}.in .a small{font-size:12.5px;font-weight:600}
.in.fold{color:var(--ink2)}.in.fold .c{background:#e3f3ec;color:#0b6b4f}
.show{font-size:13px;font-weight:700;color:#45568a}
.terms{background:var(--mid);color:var(--soft);border-radius:22px;padding:26px}
.terms .k{font-size:13px;color:#9fbcb2;font-weight:600}
.terms .n{font-family:Outfit;font-size:34px;font-weight:600;color:var(--lime);margin:6px 0 18px;letter-spacing:-.02em}
.terms dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:12px;font-size:13.5px}
.terms dt{color:#b9cfc6}.terms dd{margin:0;text-align:right;font-weight:700}
.terms .note{margin-top:22px;padding-top:18px;border-top:1px solid #12494a;display:flex;gap:12px;font-size:13px;color:#cfe0d8;line-height:1.5}
.who2{padding:22px 24px;margin-top:20px}
.who2 h3{font-size:16px;margin-bottom:6px}
.who2 .r{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f0f2ef;font-size:13.5px}
.who2 .r:last-child{border:0}.who2 .r span{color:var(--ink3)}
/* record-payment modal */
.scrim{position:fixed;inset:0;background:rgba(5,30,31,.45);display:grid;place-items:center}
.modal{width:480px;background:#fff;border-radius:24px;padding:28px 30px;box-shadow:0 30px 80px -20px rgba(0,0,0,.35)}
.modal .mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.modal .mh h3{font-size:22px}
.modal .f{margin-bottom:14px}
.modal .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.amt{height:64px;font:600 28px Outfit}
.applies{background:var(--soft);border-radius:12px;padding:12px 14px;font-size:13px;color:#2d4f45;margin:6px 0 16px;display:flex;gap:10px;align-items:center}
.applies svg{width:18px;height:18px;flex:none;color:#0b6b4f}
.up{border:1.5px dashed #c9d3ce;border-radius:12px;padding:16px;text-align:center;font-size:13px;color:var(--ink3);margin-bottom:20px}`;
const inst = ([n, d, a, p, s]) => {
  const c = s === 'overdue' ? `<div class="c" style="background:#fde7e2;color:#a83420">${n}</div>` : s === 'due' ? `<div class="c" style="background:#fff2d6;color:#8a5a00">${n}</div>` : `<div class="c">${n}</div>`;
  const right = s === 'overdue' ? `<b class="num">${naira(a - p)} left</b><small class="late">26 days late</small>` : s === 'due' ? `<b class="num">${naira(a)}</b><small style="color:#8a5a00">Due in 4 days</small>` : `<b class="num" style="color:var(--ink2);font-weight:600">${naira(a)}</b>`;
  const sub = s === 'overdue' ? `${naira(p)} of ${naira(a)} paid on 30 Sep` : s === 'due' ? 'Next payment' : 'Upcoming';
  return `<div class="in">${c}<div class="t"><b>${d}</b><small>${sub}</small></div><div class="a">${right}</div></div>`;
};
const detailBody = `
<div class="crumb">${I.back}Financings</div>
<div class="dhead"><div class="bigava">CO</div><div><h1>Chinedu Okafor</h1><div class="meta">MF-2026-0031 · 2019 Toyota Corolla LE ${pill('active')}</div></div><span style="flex:1"></span><div class="ib">${I.more}</div><span class="btn pri" style="height:44px;border-radius:12px">+ Record payment</span></div>
<div class="tabs"><span>Summary</span><span>Pricing and approval</span><span class="on">Payment plan</span><span>Payments</span><span>Activity</span></div>
<div class="cols"><div>
<div class="card hero"><div class="k">Balance remaining</div><div class="n num">${naira(3850000)}<small>of ${naira(9200000)}</small></div>
<div class="pbar"><i></i></div><div class="pl"><span>${naira(5350000)} paid, including the down payment</span><b style="color:var(--ink)">58%</b></div>
<div class="facts"><div><div class="k muted">Next payment</div><b class="num">${naira(600000)} · 28 Oct</b></div><div><div class="k muted">Overdue</div><b class="num late">${naira(250000)}</b></div><div><div class="k muted">Instalments left</div><b>7 of 12</b></div></div></div>
<div class="card sched"><div class="hd"><h3>Instalments</h3><span class="sp"></span><div class="seg"><span class="on">Unpaid</span><span>All</span></div></div>
<div class="in fold"><div class="c">${I.check}</div><div class="t"><b>5 instalments paid</b><small>28 Apr – 28 Aug 2026, all on time</small></div><span class="show">Show</span></div>
${sched.slice(5, 10).map(inst).join('')}
<div class="in" style="justify-content:center;padding:14px 0"><span class="show">Show 2 more</span></div></div>
</div>
<aside>
<div class="terms"><div class="k">Sale price, fixed</div><div class="n num">${naira(9200000)}</div>
<dl><dt>Asset cost</dt><dd>${naira(8000000)}</dd><dt>Profit (15%)</dt><dd>${naira(1200000)}</dd><dt>Down payment</dt><dd>${naira(2000000)}</dd><dt>Instalments</dt><dd>12 × ${naira(600000)}</dd></dl>
<div class="note">${mark(C.lime, 22)}<span>This price never changes. Late payments add no charges.</span></div></div>
<div class="card who2"><h3>Contacts</h3>
<div class="r"><span>Phone</span><b>0803 412 7781</b></div><div class="r"><span>Guarantor</span><b>Ifeoma Okafor (sister)</b></div><div class="r"><span>Vendor</span><b>Prestige Motors, Ikeja</b></div></div>
</aside></div>`;
const detail = page('MF-2026-0031', shell('fin', detailBody), detCss);
const detailModal = page('Record payment', shell('fin', detailBody) + `<div class="scrim"><div class="modal">
<div class="mh"><h3>Record a payment</h3><div class="ib" style="border:0;background:#f1f4ee">${I.x}</div></div>
<div class="f"><label>Amount received</label><div class="field amt">₦ 250,000</div></div>
<div class="applies">${I.check}<span>This clears the overdue <b>28 Sep</b> instalment.</span></div>
<div class="two"><div class="f"><label>Date</label><div class="field">24 Oct 2026</div></div><div class="f"><label>Method</label><div class="field"><span>Bank transfer</span><span class="muted">▾</span></div></div></div>
<div class="f"><label>Reference <span class="muted" style="font-weight:500">(optional)</span></label><div class="field muted">e.g. GTB-58213…</div></div>
<div class="up">Drop the receipt here or <b style="color:#45568a">browse</b></div>
<div style="display:flex;gap:10px"><span class="btn" style="flex:1;justify-content:center;height:48px">Cancel</span><span class="btn pri" style="flex:2;justify-content:center;height:48px">Save payment</span></div>
</div></div>`, detCss);


// ---------- 5. Agreement & acceptance ----------
const agrCss = `
body{background:var(--soft)}
.ahead{background:var(--mid);color:var(--soft);padding:22px 0 120px}
.wrap{max-width:820px;margin:0 auto;padding:0 32px}
.ahead .bar1{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#a9c4bb;font-weight:600}
.ahead h1{font-size:40px;margin:52px 0 10px;color:var(--soft)}
.ahead p{margin:0;color:#b9cfc6;font-size:16px;line-height:1.55;max-width:600px}
.doc{margin-top:-90px;padding:36px 40px;border-radius:22px;background:#fff;border:0;box-shadow:0 20px 60px -30px rgba(5,50,51,.35)}
.doc h2{font-size:20px;margin:0 0 16px}
.sec{padding:30px 0;border-top:1px solid var(--line)}.sec:first-child{padding-top:0;border:0}
.asset{display:flex;gap:16px;align-items:center}
.asset .ic{width:56px;height:56px;border-radius:14px;background:var(--pat);display:grid;place-items:center}
.price{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:12px;align-items:center;text-align:center}
.price>div{background:#f6f8f3;border-radius:14px;padding:16px 10px}
.price>div.sale{background:var(--mid);color:var(--soft)}
.price .l{font-size:12.5px;font-weight:600;color:var(--ink3)}.price .sale .l{color:#a9c4bb}.price .sale .v{color:var(--lime)}
.price .v{font-family:Outfit;font-weight:600;font-size:24px;margin-top:4px}
.price .op{font-family:Outfit;font-size:24px;color:var(--ink3)}
.fixed{margin-top:16px;background:var(--lime);border-radius:14px;padding:14px 18px;display:flex;gap:14px;align-items:center;color:var(--mid);font-weight:600;font-size:14.5px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.split>div{border:1px solid var(--line);border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;font-size:14px}
.sch{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sch>div{border:1px solid var(--line);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;font-size:13.5px}
.sch>div span:first-child{color:var(--ink3)}
.acc{border:1px solid var(--line);border-radius:12px;margin-bottom:8px;padding:14px 16px;display:flex;justify-content:space-between;font-weight:600}
.acc.open{display:block}.acc.open p{font-weight:400;color:var(--ink2);margin:10px 0 0;line-height:1.6;font-size:14px}
.chk{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;font-size:14.5px;line-height:1.5}
.chk i{flex:0 0 22px;height:22px;border-radius:6px;background:var(--mid);color:var(--lime);display:grid;place-items:center;font-style:normal;font-size:13px;margin-top:1px}
.sign{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;margin-top:22px}
.sign .field{height:54px;font-family:Outfit;font-size:20px}
.sign .btn{height:54px;padding:0 30px;font-size:16px}
.fine{font-size:12.5px;color:var(--ink3);margin-top:12px;line-height:1.5}
@media(max-width:700px){
 .wrap{padding:0 16px}.ahead h1{font-size:30px;margin-top:32px}.ahead p{font-size:15px}
 .doc{padding:24px 20px;border-radius:18px}
 .price{grid-template-columns:1fr;gap:6px}.price .op{line-height:1}
 .split{grid-template-columns:1fr}.sch{grid-template-columns:1fr 1fr}.sch>div{flex-direction:column;gap:2px}.sign{grid-template-columns:1fr}.sign .btn{justify-content:center}
}`;
const agr = page('Your agreement', `<header class="ahead"><div class="wrap"><div class="bar1">${logo('on-dark', 30)}<span>Ref MF-2026-0031</span></div>
<h1>Your Murabaha agreement</h1><p>Hi Chinedu, here's everything we agreed. Please read it, then accept at the bottom. It takes about 3 minutes.</p></div></header>
<div class="wrap"><div class="doc card">
<div class="sec"><h2>What we're buying for you</h2><div class="asset"><div class="ic">${carIcon}</div><div><div style="font-weight:700;font-size:16px">2019 Toyota Corolla LE · Silver</div><div class="muted" style="font-size:13.5px;margin-top:2px">From Prestige Motors, 14 Obafemi Awolowo Way, Ikeja · VIN ending 48213</div></div></div>
<p class="ink2" style="margin:14px 0 0;line-height:1.6;font-size:14.5px">Haki buys the car from the vendor and owns it first. Once you accept, we sell it to you at the price below.</p></div>
<div class="sec"><h2>The price</h2>
<div class="price"><div><div class="l">What we pay the vendor</div><div class="v num">${naira(8000000)}</div></div><span class="op">+</span><div><div class="l">Our profit</div><div class="v num">${naira(1200000)}</div></div><span class="op">=</span><div class="sale"><div class="l">Your price</div><div class="v num">${naira(9200000)}</div></div></div>
<div class="fixed">${mark(C.midnight, 28)}<span>This price is fixed. It will never go up, even if a payment is late.</span></div>
<div class="split"><div><span class="ink2">Down payment</span><b>${naira(2000000)}</b></div><div><span class="ink2">Then 12 monthly payments of</span><b>${naira(600000)}</b></div></div></div>
<div class="sec"><h2>Your payment dates</h2><div class="sch">${sched.map(([n, d, a]) => `<div><span>${d}</span><b class="num">${naira(a)}</b></div>`).join('')}</div></div>
<div class="sec"><h2>Key terms</h2>
<div class="acc open">If a payment is late ▴<p>We'll remind you first. We never add interest. If a late fee applies, it goes to charity and Haki doesn't keep any of it.</p></div>
<div class="acc">Paying off early<span class="muted">▾</span></div><div class="acc">Ownership and insurance<span class="muted">▾</span></div><div class="acc">If payments stop<span class="muted">▾</span></div>
<div style="margin-top:10px;font-size:13.5px;font-weight:600;color:#45568a">Read the full agreement (PDF, 4 pages)</div></div>
<div class="sec"><h2>Accept</h2>
<div class="chk"><i>✓</i>I have read the agreement and I understand the price and payment dates.</div>
<div class="chk"><i>✓</i>I agree to buy the asset from Haki at the fixed price of ${naira(9200000)}.</div>
<div class="chk"><i>✓</i>My details and my guarantor's details are true.</div>
<div class="sign"><div><label>Type your full name to sign</label><div class="field">Chinedu Emmanuel Okafor</div></div><span class="btn pri">Accept agreement</span></div>
<p class="fine">We'll record the date, time and your IP address when you accept, and email you a PDF copy. Questions? WhatsApp us on 0803 000 0000.</p></div>
</div><div style="height:60px"></div></div>`, agrCss);

const pages = { '1-apply': apply, '2-dashboard': dash, '3-financings': list, '4-financing-detail': detail, '4b-record-payment': detailModal, '5-agreement': agr };
for (const [n, h] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, n + '.html'), h);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  for (const [n, w, mobile] of [['1-apply', 1440], ['2-dashboard', 1440], ['3-financings', 1440], ['4-financing-detail', 1440], ['4b-record-payment', 1440], ['5-agreement', 1440], ['1-apply', 390, 1], ['5-agreement', 390, 1]]) {
    const p = await browser.newPage({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(OUT, n + '.html'));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, 'png', n + (mobile ? '-mobile' : '') + '.png'), fullPage: n !== '4b-record-payment' });
    await p.close();
  }
  await browser.close();
})();
