import { Download, Mail, MessageCircle, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { createRoot, type Root } from "react-dom/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AccountingReceiptTemplate from "./AccountingReceiptTemplate";
import type { ReceiptData } from "../../lib/receiptHelpers";
import { openWhatsApp } from "@/lib/whatsappShare";

interface Props {
  receipt: ReceiptData;
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountingReceiptModal({ receipt, isOpen, onClose }: Props) {
  // In production, replace window.print() with html2pdf or a server-side
  // Puppeteer edge function so we can attach the PDF directly to email/WhatsApp.
  function printReceipt() {
    const existing = document.getElementById("accounting-receipt-print-root");
    if (existing) existing.remove();

    const mount = document.createElement("div");
    mount.id = "accounting-receipt-print-root";
    document.body.appendChild(mount);
    const root: Root = createRoot(mount);
    root.render(<AccountingReceiptTemplate receipt={receipt} />);

    const cleanup = () => {
      try { root.unmount(); } catch {
        // Ignore unmount race conditions on cleanup.
      }
      mount.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Safety fallback in case afterprint never fires (some browsers)
        setTimeout(cleanup, 2000);
      });
    });
  }

  const handleDownload = printReceipt;
  const handlePrint = printReceipt;

  function handleEmail() {
    // Wire to a Resend/SES edge function once email service is configured.
    toast.info(`Email delivery coming soon. Will send to ${receipt.clientEmail}`);
  }

  function handleWhatsApp() {
    const msg =
      `Dear ${receipt.clientName},\n\n` +
      `Please find your payment receipt ${receipt.receiptNumber} for ${receipt.currency} ${receipt.amountPaid.toFixed(2)} received on ${receipt.receiptDate}.\n\n` +
      `Service: ${receipt.serviceType}\n` +
      `Reference: ${receipt.paymentReference ?? "N/A"}\n\n` +
      `Thank you for choosing Future Link Consultants!\n\n` +
      `Team Future Link`;
    openWhatsApp(receipt.clientPhone, msg);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-full sm:max-h-[90vh] max-h-screen h-screen sm:h-auto p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-base font-semibold">Payment receipt</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{receipt.receiptNumber}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 p-4 border-b bg-muted/30 print:hidden">
          <Button onClick={handleDownload}>
            <Download className="size-4 mr-1.5" /> Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="size-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" onClick={handleEmail}>
            <Mail className="size-4 mr-1.5" /> Email to client
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsApp}
            className="border-green-500/40 text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-500/10"
          >
            <MessageCircle className="size-4 mr-1.5" /> WhatsApp
          </Button>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto max-h-[60vh] flex-1 p-4 bg-white">
          <AccountingReceiptTemplate receipt={receipt} />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 border-t print:hidden">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}