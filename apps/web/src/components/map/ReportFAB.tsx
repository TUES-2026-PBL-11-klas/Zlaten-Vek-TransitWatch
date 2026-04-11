import { Flag } from 'lucide-react';

interface ReportFABProps {
  onClick: () => void;
}

export default function ReportFAB({ onClick }: ReportFABProps) {
  return (
    <button className="report-fab" onClick={onClick}>
      <Flag size={18} strokeWidth={2.2} />
      <span className="report-fab-label">Докладвай</span>
    </button>
  );
}
