import type { ReactNode } from "react";

type Props = {
  title: string;
  wide?: boolean;
  onClose: () => void;
  /** When false, backdrop click does not close (prevents accidental dismiss while editing). */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

export function ModalShell({ title, wide, onClose, dismissOnBackdrop = true, children, footer }: Props) {
  return (
    <div
      className="modal-bg"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div className={`modal${wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}
