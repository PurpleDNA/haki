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

/* staff shell */
.shell{display:grid;grid-template-columns:232px 1fr;min-height:100vh}
.side{background:var(--mid);color:var(--soft);padding:26px 16px;display:flex;flex-direction:column;gap:4px}
.side .brand{padding:0 10px 26px}
.nav{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;color:#b9cfc6;font-weight:600}
.nav.on{background:var(--lime);color:var(--mid)}
.nav b{margin-left:auto;background:#0f4a4b;color:var(--lime);font-size:11px;padding:2px 8px;border-radius:99px}
.nav.on b{background:var(--mid)}
.nav svg{width:18px;height:18px}
.side .foot{margin-top:auto;border-top:1px solid #12494a;padding:16px 10px 0;display:flex;gap:10px;align-items:center}
.ava{width:34px;height:34px;border-radius:50%;background:var(--slate);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
.linkbox{margin:14px 0 0;background:#0b3f40;border-radius:12px;padding:14px;font-size:12px;color:#b9cfc6}
.linkbox b{display:block;color:var(--soft);font-size:13px;margin-bottom:4px}
.linkbox code{display:block;margin-top:8px;background:#062a2b;color:var(--lime);padding:8px 10px;border-radius:8px;font-size:11.5px}
.main{padding:28px 36px 48px;min-width:0}
.top{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.top h1{font-size:28px}
.top .sp{flex:1}
.search{width:300px;height:40px;border:1px solid var(--line);background:#fff;border-radius:10px;display:flex;align-items:center;gap:8px;padding:0 12px;color:var(--ink3)}
.seg{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:10px;padding:3px}
.seg span{padding:7px 12px;border-radius:7px;font-weight:600;font-size:13px;color:var(--ink2)}
.seg span.on{background:var(--mid);color:var(--soft)}
`;

const navIcon = {
  dash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="7" height="9" rx="2"/><rect x="11" y="2" width="7" height="5" rx="2"/><rect x="11" y="9" width="7" height="9" rx="2"/><rect x="2" y="13" width="7" height="5" rx="2"/></svg>',
  fin: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="16" height="14" rx="2.5"/><path d="M2 8h16M6 12.5h4"/></svg>',
  led: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 2c3 3 5 5.5 5 8.5a5 5 0 0 1-10 0C5 7.5 7 5 10 2z"/></svg>',
};
const shell = (active, body) => `<div class="shell"><aside class="side">
<div class="brand">${logo('on-dark', 34)}</div>
<div class="nav ${active === 'dash' ? 'on' : ''}">${navIcon.dash}Dashboard</div>
<div class="nav ${active === 'fin' ? 'on' : ''}">${navIcon.fin}Financings<b>4 new</b></div>
<div class="linkbox"><b>Application link</b>Share this with anyone who wants to apply.<code>haki.ng/apply</code></div>
<div class="foot"><div class="ava">AO</div><div><div style="font-weight:700">Amina Ogunleye</div><div style="font-size:12px;color:#9bb6ad">Credit officer</div></div></div>
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
const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const disb = [18.2, 9.5, 22.0, 14.8, 26.4, 12.1];
const coll = [8.1, 9.0, 10.4, 11.2, 12.9, 13.6];
const rate = [91, 94, 88, 96, 93, 89];

const barChart = () => {
  const W = 620, H = 240, l = 44, b = 28, t = 12, max = 30;
  const y = v => t + (H - t - b) * (1 - v / max);
  const gw = (W - l) / months.length, bw = 22;
  let g = '';
  [0, 10, 20, 30].forEach(v => { g += `<line x1="${l}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${v ? '#eef1ee' : '#cfd6d2'}"/><text x="${l - 10}" y="${y(v) + 4}" text-anchor="end" class="ax">₦${v}M</text>`; });
  months.forEach((m, i) => {
    const cx = l + gw * i + gw / 2;
    [[disb[i], S.disburse, -bw - 1, 'Disbursed'], [coll[i], S.collect, 1, 'Collected']].forEach(([v, c, dx, n]) => {
      const x = cx + dx, yy = y(v), h = y(0) - yy;
      g += `<path class="hit" data-tip="${m} · ${n} ${M(v)}" d="M${x} ${y(0)} V${yy + 4} q0 -4 4 -4 h${bw - 8} q4 0 4 4 V${y(0)} Z" fill="${c}"/>`;
    });
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="ax">${m}</text>`;
  });
  // selective direct labels on the latest month
  const lx = l + gw * 5 + gw / 2;
  g += `<text x="${lx + bw / 2 + 1}" y="${y(coll[5]) - 7}" text-anchor="middle" class="dl">${M(coll[5])}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
};
const lineChart = () => {
  const W = 360, H = 240, l = 40, b = 28, t = 16, lo = 80, hi = 100;
  const y = v => t + (H - t - b) * (1 - (v - lo) / (hi - lo));
  const x = i => l + 14 + (W - l - 28) * i / 5;
  let g = '';
  [80, 90, 100].forEach(v => { g += `<line x1="${l}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 80 ? '#cfd6d2' : '#eef1ee'}"/><text x="${l - 10}" y="${y(v) + 4}" text-anchor="end" class="ax">${v}%</text>`; });
  g += `<path d="${rate.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(v)).join(' ')}" fill="none" stroke="${S.collect}" stroke-width="2" stroke-linejoin="round"/>`;
  rate.forEach((v, i) => { g += `<circle class="hit" data-tip="${months[i]} · ${v}% collected on time" cx="${x(i)}" cy="${y(v)}" r="4.5" fill="${S.collect}" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${months[i]}</text>`; });
  g += `<text x="${x(5)}" y="${y(89) - 12}" text-anchor="middle" class="dl">89%</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
};
const hbars = rows => {
  const max = Math.max(...rows.map(r => r[1]));
  return rows.map(([n, v]) => `<div class="hb"><span>${n}</span><div class="tr"><i style="width:${v / max * 100}%"></i></div><b class="num">${v}</b></div>`).join('');
};
const dashCss = `
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:18px}
.kpi{padding:18px 18px 16px}
.kpi .l{font-size:12.5px;color:var(--ink3);font-weight:600}
.kpi .v{font-family:Outfit;font-size:28px;font-weight:600;margin:8px 0 6px;letter-spacing:-.02em}
.kpi .d{font-size:12px;font-weight:600;color:var(--ink2)}
.kpi.hero{background:var(--mid);border-color:var(--mid);color:var(--soft)}.kpi.hero .l{color:#a9c4bb}.kpi.hero .d{color:var(--lime)}
.kpi.warn .v{color:#a83420}
.row{display:grid;gap:18px;margin-bottom:18px}
.card .hd{display:flex;align-items:center;gap:12px;padding:18px 20px 6px}
.card .hd h3{font-size:16px}
.card .hd .sp{flex:1}
.lg{display:flex;gap:14px;font-size:12px;color:var(--ink2);font-weight:600}
.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.ax{font:500 11px Manrope;fill:var(--ink3)} .dl{font:700 11.5px Manrope;fill:var(--ink)}
.cb{padding:6px 20px 16px}
.hb{display:grid;grid-template-columns:110px 1fr 30px;gap:12px;align-items:center;font-size:13px;margin:11px 0}
.hb .tr{height:10px;background:#f0f3ef;border-radius:99px}.hb .tr i{display:block;height:100%;background:var(--mid);border-radius:99px}
.hb b{text-align:right}
.sub{font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 2px}
.wl td{padding:11px 20px}.wl th{padding:8px 20px}
.who{display:flex;flex-direction:column}.who small{color:var(--ink3);font-size:12px}
.link{font-size:13px;font-weight:600;color:#45568a}
.days{font-weight:700;color:#a83420}
#tip{position:fixed;pointer-events:none;background:var(--mid);color:var(--soft);font:600 12px Manrope;padding:6px 10px;border-radius:8px;opacity:0;transition:opacity .1s}
.hit{cursor:pointer}`;
const tipJs = `<div id="tip"></div><script>const t=document.getElementById('tip');document.querySelectorAll('.hit').forEach(e=>{e.addEventListener('mousemove',v=>{t.textContent=e.dataset.tip;t.style.opacity=1;t.style.left=v.clientX+12+'px';t.style.top=v.clientY-34+'px'});e.addEventListener('mouseleave',()=>t.style.opacity=0)})</script>`;
const kpi = (l, v, d, cls = '') => `<div class="card kpi ${cls}"><div class="l">${l}</div><div class="v num">${v}</div><div class="d">${d}</div></div>`;
const dueSoon = [['Aisha Bello', 'MF-2026-0018 · Generator', 'Mon 26 Oct', 145000], ['Chinedu Okafor', 'MF-2026-0031 · Toyota Corolla', 'Wed 28 Oct', 600000], ['Halima Sani', 'MF-2026-0027 · Sewing machines', 'Wed 28 Oct', 88000], ['Tunde Adeyemi', 'MF-2026-0035 · Laptop', 'Fri 30 Oct', 72500]];
const overdue = [['Emeka Nwosu', 'MF-2026-0009 · Tricycle (Keke)', 41, 310000], ['Chinedu Okafor', 'MF-2026-0031 · Toyota Corolla', 26, 250000], ['Musa Danjuma', 'MF-2026-0022 · Freezer', 12, 95000], ['Kemi Balogun', 'MF-2026-0029 · iPhone 15', 5, 64000]];
const fresh = [['Zainab Abdullahi', 'Grinding mill · ₦1,450,000', 'Today, 09:12'], ['Ibrahim Musa', 'Honda Accord 2017 · ₦9,800,000', 'Yesterday'], ['Ngozi Eze', 'POS terminals ×4 · ₦620,000', '22 Oct']];
const dash = page('Dashboard', shell('dash', `
<div class="top"><h1>Good morning, Amina</h1><span class="sp"></span><div class="seg"><span>30 days</span><span>Quarter</span><span class="on">6 months</span><span>Year</span><span>Custom</span></div></div>
<div class="kpis">
${kpi('Active financings', '38', '+4 this month', 'hero')}
${kpi('Total financed (cost)', '₦142.6M', '59 financings to date')}
${kpi('Profit booked', '₦21.4M', '15.0% average margin')}
${kpi('Total collected', '₦68.9M', 'incl. down payments')}
${kpi('Outstanding', '₦95.1M', 'across 38 financings')}
${kpi('Overdue', '₦3.2M', '! 5 financings late', 'warn')}
</div>
<div class="row" style="grid-template-columns:1.7fr 1fr">
<div class="card"><div class="hd"><h3>Disbursed vs collected</h3><span class="sp"></span><div class="lg"><span><i style="background:${S.disburse}"></i>Disbursed</span><span><i style="background:${S.collect}"></i>Collected</span></div></div><div class="cb">${barChart()}</div></div>
<div class="card"><div class="hd"><h3>On-time collection rate</h3></div><div class="cb">${lineChart()}</div></div>
</div>
<div class="row" style="grid-template-columns:1fr 1fr 1fr">
<div class="card"><div class="hd"><h3>Financings by status</h3></div><div class="cb">${hbars([['New', 4], ['Under review', 6], ['Agreement sent', 3], ['Active', 38], ['Completed', 21], ['Declined', 7]])}</div></div>
<div class="card"><div class="hd"><h3>By asset type</h3></div><div class="cb">${hbars([['Vehicles', 24], ['Equipment', 17], ['Electronics', 11], ['Other', 7]])}<div class="muted" style="font-size:12px;margin-top:14px">Vehicles are 61% of value financed</div></div></div>
<div class="card"><div class="hd"><h3>New applications</h3><span class="sp"></span><span class="link">Review all →</span></div>
<table class="wl"><tbody>${fresh.map(([n, a, w]) => `<tr><td><div class="who"><b>${n}</b><small>${a}</small></div></td><td class="r muted" style="font-size:12.5px">${w}</td></tr>`).join('')}</tbody></table></div>
</div>
<div class="row" style="grid-template-columns:1fr 1fr">
<div class="card"><div class="hd"><h3>Due in the next 7 days</h3><span class="sp"></span><span class="muted" style="font-size:13px;font-weight:600">${naira(905500)} expected</span></div>
<table class="wl"><thead><tr><th>Borrower</th><th>Due</th><th class="r">Amount</th></tr></thead><tbody>${dueSoon.map(([n, a, d, v]) => `<tr><td><div class="who"><b>${n}</b><small>${a}</small></div></td><td>${d}</td><td class="r num"><b>${naira(v)}</b></td></tr>`).join('')}</tbody></table></div>
<div class="card"><div class="hd"><h3>Overdue instalments</h3><span class="sp"></span>${pill('overdue', '5 late')}</div>
<table class="wl"><thead><tr><th>Borrower</th><th>Days late</th><th class="r">Unpaid</th></tr></thead><tbody>${overdue.map(([n, a, d, v]) => `<tr><td><div class="who"><b>${n}</b><small>${a}</small></div></td><td class="days">${d} days</td><td class="r num"><b>${naira(v)}</b></td></tr>`).join('')}</tbody></table></div>
</div>${tipJs}`), dashCss);

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
  sched.push([i + 1, `28 ${mn[i]} ${yr}`, 600000, paid, st, i < 5 ? `${26 + (i % 3)} ${mn[i]}` : i === 5 ? '30 Sep (part)' : '']);
}
const detCss = `
.crumb{font-size:13px;color:var(--ink3);font-weight:600;margin-bottom:10px}
.dhead{display:flex;align-items:flex-start;gap:16px;margin-bottom:20px}
.dhead h1{font-size:30px}
.dhead .meta{display:flex;gap:10px;align-items:center;margin-top:8px;color:var(--ink2);font-size:13.5px}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:22px}
.tabs span{padding:12px 16px;font-weight:600;color:var(--ink3);border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs span.on{color:var(--mid);border-color:var(--mid)}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}
.stats{display:grid;grid-template-columns:repeat(4,1fr)}
.stats>div{padding:18px 20px;border-right:1px solid var(--line)}.stats>div:last-child{border:0}
.stats .l{font-size:12.5px;color:var(--ink3);font-weight:600}.stats .v{font-family:Outfit;font-size:24px;font-weight:600;margin-top:6px}
.prog2{padding:4px 20px 20px}
.pbar{height:12px;border-radius:99px;background:#eef1ee;display:flex;overflow:hidden;gap:2px}
.pbar i{display:block;height:100%}
.plg{display:flex;gap:18px;font-size:12.5px;color:var(--ink2);margin-top:10px;font-weight:600}
.plg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
tr.ov td{background:#fff8f6} tr.du td{background:#fffbf0}
.side2 .card{padding:20px;margin-bottom:16px}
.side2 h3{font-size:16px;margin-bottom:14px}
.side2 .field{height:42px;font-size:14px}
.side2 .f{margin-bottom:12px}
.apply-note{background:var(--pat);border-radius:10px;padding:10px 12px;font-size:12.5px;color:#34477a;margin:4px 0 14px}
.up{border:1.5px dashed #c9d3ce;border-radius:10px;padding:14px;text-align:center;font-size:13px;color:var(--ink3);margin-bottom:14px}
.terms dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:9px 10px;font-size:13.5px}
.terms dt{color:var(--ink2)}.terms dd{margin:0;text-align:right;font-weight:700}
.terms .tot{border-top:1px solid var(--line);padding-top:9px}
.note{margin-top:14px;font-size:12.5px;color:#2d4f45;background:var(--soft);border-radius:10px;padding:10px 12px;display:flex;gap:10px}`;
const paidPct = 5350000 / 9200000;
const detail = page('MF-2026-0031', shell('fin', `
<div class="crumb">Financings / MF-2026-0031</div>
<div class="dhead"><div><h1>Chinedu Okafor</h1><div class="meta"><b class="ref" style="color:var(--mid)">MF-2026-0031</b>·<span>2019 Toyota Corolla LE</span>·${pill('active')}${pill('overdue', '1 instalment overdue')}</div></div><span style="flex:1"></span><span class="btn">⎙ Agreement PDF</span><span class="btn">Message</span><span class="btn pri">+ Record payment</span></div>
<div class="tabs"><span>Summary</span><span>Pricing and approval</span><span class="on">Payment plan</span><span>Payments</span><span>Activity and notes</span></div>
<div class="cols"><div>
<div class="card" style="margin-bottom:18px">
<div class="stats"><div><div class="l">Sale price (fixed)</div><div class="v num">${naira(9200000)}</div></div><div><div class="l">Paid so far</div><div class="v num">${naira(5350000)}</div></div><div><div class="l">Balance</div><div class="v num">${naira(3850000)}</div></div><div><div class="l">Next due · 28 Oct</div><div class="v num">${naira(850000)}</div><div class="muted" style="font-size:12px;margin-top:2px">incl. ₦250,000 overdue</div></div></div>
<div class="prog2"><div class="pbar"><i style="width:${2000000 / 9200000 * 100}%;background:${C.midnight}"></i><i style="width:${3350000 / 9200000 * 100}%;background:${S.collect}"></i><i style="width:${250000 / 9200000 * 100}%;background:#d0503a"></i></div>
<div class="plg"><span><i style="background:${C.midnight}"></i>Down payment ₦2.0M</span><span><i style="background:${S.collect}"></i>Instalments paid ₦3.35M</span><span><i style="background:#d0503a"></i>Overdue ₦0.25M</span><span style="margin-left:auto">${Math.round(paidPct * 100)}% of sale price paid</span></div></div>
</div>
<div class="card" style="overflow:hidden"><table><thead><tr><th>#</th><th>Due date</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Remaining</th><th>Status</th><th>Paid on</th></tr></thead>
<tbody>${sched.map(([n, d, a, p, s, on]) => `<tr class="${s === 'overdue' ? 'ov' : s === 'due' ? 'du' : ''}"><td class="muted">${n}</td><td><b>${d}</b></td><td class="r num">${naira(a)}</td><td class="r num">${p ? naira(p) : '<span class="muted">—</span>'}</td><td class="r num">${a - p ? naira(a - p) : '<span class="muted">—</span>'}</td><td>${s === 'overdue' ? pill('overdue', 'Overdue · 26 days') : s === 'due' ? pill('due', 'Due in 4 days') : pill(s)}</td><td class="muted">${on}</td></tr>`).join('')}</tbody></table></div>
</div>
<div class="side2">
<div class="card"><h3>Record a payment</h3>
<div class="f"><label>Amount</label><div class="field">₦ 250,000</div></div>
<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="f"><label>Date</label><div class="field">24 Oct 2026</div></div><div class="f"><label>Method</label><div class="field"><span>Transfer</span><span class="muted">▾</span></div></div></div>
<div class="f"><label>Bank reference</label><div class="field muted">e.g. GTB-58213…</div></div>
<div class="apply-note">Goes to the oldest unpaid instalment first: <b>#6 (Sep)</b>, which clears it.</div>
<div class="up">⤒ Drop receipt here or <b style="color:#45568a">browse</b></div>
<span class="btn pri" style="width:100%;justify-content:center">Save payment</span></div>
<div class="card terms"><h3>Murabaha terms</h3><dl>
<dt>Asset cost (paid to Prestige Motors)</dt><dd>${naira(8000000)}</dd><dt>Profit · 15% fixed</dt><dd>${naira(1200000)}</dd><dt class="tot"><b style="color:var(--ink)">Sale price</b></dt><dd class="tot">${naira(9200000)}</dd><dt>Down payment</dt><dd>${naira(2000000)}</dd><dt>Instalments</dt><dd>12 × ${naira(600000)}</dd></dl>
<div class="note">${mark(C.midnight, 20)}<span>No charge is ever added for late payment. Agreed late fees go to the charity ledger, which holds ₦0 for this financing.</span></div></div>
</div></div>`), formCss.match(/\.grid2[^}]*}/)[0] + detCss);

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

const pages = { '1-apply': apply, '2-dashboard': dash, '3-financings': list, '4-financing-detail': detail, '5-agreement': agr };
for (const [n, h] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, n + '.html'), h);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  for (const [n, w, mobile] of [['1-apply', 1440], ['2-dashboard', 1440], ['3-financings', 1440], ['4-financing-detail', 1440], ['5-agreement', 1440], ['1-apply', 390, 1], ['5-agreement', 390, 1]]) {
    const p = await browser.newPage({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(OUT, n + '.html'));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, 'png', n + (mobile ? '-mobile' : '') + '.png'), fullPage: true });
    await p.close();
  }
  await browser.close();
})();
