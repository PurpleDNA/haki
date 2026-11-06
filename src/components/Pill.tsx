import { STATUS_LABEL, type FinancingStatus } from '@/domain/status';

const STYLE: Record<string, [string, string, string]> = {
  submitted: ['#f1f3f5', '#4a5560', '+'],
  under_review: ['#e9efff', '#45568a', '◔'],
  agreement_sent: ['#efeaff', '#5a45a8', '✉'],
  accepted: ['#fff2d6', '#8a5a00', '◷'],
  active: ['#e3f3ec', '#0b6b4f', '●'],
  completed: ['#eef0f2', '#3d4650', '✓'],
  declined: ['#f4f4f4', '#6b6b6b', '×'],
  expired: ['#f4f4f4', '#6b6b6b', '×'],
  written_off: ['#fde7e2', '#a83420', '×'],
  overdue: ['#fde7e2', '#a83420', '!'],
};

export function Pill({ status, overdue }: { status: FinancingStatus; overdue?: boolean }) {
  const key = overdue ? 'overdue' : status;
  const [bg, fg, icon] = STYLE[key];
  return (
    <span className="pill" style={{ background: bg, color: fg }}>
      <i aria-hidden="true">{icon}</i>{overdue ? 'Overdue' : status === 'accepted' ? 'Accepted, buy item' : STATUS_LABEL[status]}
    </span>
  );
}
