import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { snapshotToReceiptData } from "./receiptHelpers";
import AccountingReceiptTemplate from "../components/receipts/AccountingReceiptTemplate";

/**
 * Render a stored `client_invoice_receipts.receipt_snapshot_jsonb` value
 * using AccountingReceiptTemplate, then trigger window.print() so the
 * user can save it as PDF or send to a printer.
 */
export function printReceiptSnapshot(snapshot: any) {
  const data = snapshotToReceiptData(snapshot);
  if (!data) { toast.error("Snapshot unavailable"); return; }
  const existing = document.getElementById("accounting-receipt-print-root");
  if (existing) existing.remove();
  const mount = document.createElement("div");
  mount.id = "accounting-receipt-print-root";
  document.body.appendChild(mount);
  const root = createRoot(mount);
  root.render(<AccountingReceiptTemplate receipt={data} />);
  const cleanup = () => {
    try { root.unmount(); } catch { /* noop */ }
    mount.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.print();
    setTimeout(cleanup, 2000);
  }));
}