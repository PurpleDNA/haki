'use client';

import { useState } from 'react';
import { monthLabel } from '@/domain/dates';
import { naira, nairaShort } from '@/domain/money';
import type { MonthPoint } from '@/domain/portfolio';

type Tab = 'collections' | 'disbursements' | 'ontime';
const TABS: [Tab, string][] = [['collections', 'Collections'], ['disbursements', 'Disbursements'], ['ontime', 'On-time rate']];

const value = (p: MonthPoint, t: Tab) => (t === 'collections' ? p.collectedKobo : t === 'disbursements' ? p.disbursedKobo : p.onTimePercent ?? 0);

/** A round axis maximum with four even steps. */
function niceMax(v: number) {
  if (v <= 0) return 400000;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag * 4 >= v) ?? 10;
  return step * mag * 4;
}

export function ChartCard({ series }: { series: { 6: MonthPoint[]; 12: MonthPoint[] } }) {
  const [tab, setTab] = useState<Tab>('collections');
  const [range, setRange] = useState<6 | 12>(12);
  const [hover, setHover] = useState<number | null>(null);
  const points = series[range];
  const pct = tab === 'ontime';
  const values = points.map((p) => value(p, tab));
  const max = pct ? 100 : niceMax(Math.max(...values));

  const W = 820, H = 270, l = 48, b = 30, t = 14;
  const y = (v: number) => t + (H - t - b) * (1 - v / max);
  const gw = (W - l) / points.length;
  const bw = Math.min(30, gw * 0.55);
  const fmt = (v: number) => (pct ? `${v}%` : naira(v));

  const total = values.reduce((s, v) => s + v, 0);
  const rated = points.filter((p) => p.onTimePercent !== null);
  const headline = pct
    ? (rated.length ? `${Math.round(rated.reduce((s, p) => s + p.onTimePercent!, 0) / rated.length)}%` : 'No data yet')
    : naira(total);
  const caption = pct ? 'average on-time rate' : tab === 'collections' ? 'collected' : 'paid to vendors';

  return (
    <div className="card">
      <div className="hd">
        <div className="seg" role="tablist">
          {TABS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <span className="sp" />
        <select className="dd" aria-label="Date range" value={range} onChange={(e) => setRange(Number(e.target.value) as 6 | 12)}>
          <option value={12}>Last 12 months</option>
          <option value={6}>Last 6 months</option>
        </select>
      </div>
      <div className="bigline"><b className="num">{headline}</b><span>{caption} in the last {range} months</span></div>
      <div className="cb chart">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${TABS.find(([k]) => k === tab)![1]} by month`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <text key={f} x={l - 12} y={y(max * f) + 4} textAnchor="end" className="ax">{pct ? `${max * f}%` : nairaShort(max * f).replace('₦', '')}</text>
          ))}
          {points.map((p, i) => {
            const v = values[i];
            const x = l + gw * i + (gw - bw) / 2;
            const last = i === points.length - 1;
            const hasBar = v > 0;
            const barY = Math.min(y(v), y(0) - 4);
            return (
              <g key={p.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={x} y={y(max)} width={bw} height={y(0) - y(max)} rx={10} fill="#f1f4ee" />
                {hasBar && <rect x={x} y={barY} width={bw} height={y(0) - barY} rx={Math.min(10, (y(0) - barY) / 2)} fill={last ? '#053233' : hover === i ? '#8ea3bb' : '#b9c8d9'} />}
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className={`ax ${last ? 'cur' : ''}`}>{monthLabel(p.month)}</text>
                <title>{`${monthLabel(p.month)}: ${pct && p.onTimePercent === null ? 'nothing due' : fmt(v)}`}</title>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="tip" style={{ left: `calc(24px + (100% - 48px) * ${(l + gw * hover + gw / 2) / W})`, top: 26 }}>
            {monthLabel(points[hover].month)} · {pct && points[hover].onTimePercent === null ? 'nothing due' : fmt(values[hover])}
          </div>
        )}
      </div>
    </div>
  );
}
