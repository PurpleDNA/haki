const ic = (d: React.ReactNode, sw = 1.8) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

export const Icons = {
  dash: ic(<><rect x="3" y="3" width="7.5" height="9" rx="2" /><rect x="13.5" y="3" width="7.5" height="5.5" rx="2" /><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" /><rect x="3" y="15" width="7.5" height="6" rx="2" /></>),
  fin: ic(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>),
  gear: ic(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>),
  out: ic(<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />),
  search: ic(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  link: ic(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>),
  wallet: ic(<><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" /><circle cx="16.5" cy="13.5" r="1.3" /></>),
  inflow: ic(<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />),
  alert: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.3v.2" /></>),
  back: ic(<path d="M15 18l-6-6 6-6" />),
  check: ic(<path d="M5 12.5l4.5 4.5L19 7.5" />, 2.2),
  x: ic(<path d="M6 6l12 12M18 6 6 18" />),
  down: ic(<path d="M12 4v12M7 11l5 5 5-5M5 20h14" />),
};
