import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';

interface MobileBottomSheetProps {
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function MobileBottomSheet({ onClose, children, title }: MobileBottomSheetProps) {
  const { handlers } = useSwipeToDismiss({ onDismiss: onClose });

  return (
    <div className="mobile-sheet-overlay">
      <div className="mobile-sheet-backdrop" onClick={onClose} />
      <div className="mobile-sheet" {...handlers}>
        <div className="mobile-sheet-handle" />
        {title && (
          <div className="mobile-sheet-header">
            <h3 className="mobile-sheet-title">{title}</h3>
            <button className="mobile-sheet-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="mobile-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}
