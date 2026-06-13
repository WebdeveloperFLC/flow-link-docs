import type { ReactNode } from "react";

type Props = {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function ModalShell({ title, wide, onClose, children, footer }: Props) {
  return (
    <div className="modal-bg" onClick={onClose}>
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
