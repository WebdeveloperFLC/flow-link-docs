import { fmtReceiptAmount, maskPassport, type ReceiptData } from "../../lib/receiptHelpers";
import flcLogo from "@/assets/flc-logo.png";

const ROW_LABEL: React.CSSProperties = { color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 };
const ROW_VALUE: React.CSSProperties = { color: "#111827", fontSize: 13, marginBottom: 6 };
const SECTION_TITLE: React.CSSProperties = { color: "#1a56db", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 };
const DIVIDER: React.CSSProperties = { borderTop: "1px solid #e5e7eb", margin: "20px 0" };

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <div style={ROW_LABEL}>{label}</div>
      <div style={ROW_VALUE}>{value}</div>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function AccountingReceiptTemplate({ receipt: r }: { receipt: ReceiptData }) {
  const fullyPaid = r.outstandingBalance <= 0;
  const statusLabel = fullyPaid ? "PAID" : "PARTIALLY PAID";
  const statusBg = fullyPaid ? "#dcfce7" : "#fef3c7";
  const statusFg = fullyPaid ? "#166534" : "#92400e";
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          body > *:not(#accounting-receipt-print-root) { display: none !important; }
          #accounting-receipt-print-root { display: block !important; position: static !important; }
          #accounting-receipt-print {
            position: static !important;
            box-shadow: none !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div
        id="accounting-receipt-print"
        style={{
          background: "#ffffff",
          color: "#111827",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          padding: 32,
          maxWidth: 760,
          margin: "0 auto",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <img
              src={r.companyLogo ?? flcLogo}
              alt="Future Link Consultants"
              style={{ height: 56, width: "auto", maxWidth: 240, objectFit: "contain", display: "block", marginBottom: 12 }}
            />
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{r.companyName}</div>
            <div style={{ fontSize: 12, color: "#333333", fontWeight: 600 }}>{r.companyEntity}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{r.companyBranch}</div>
            <div style={{ fontSize: 11, color: "#333333" }}>{r.companyAddress}</div>
            <div style={{ fontSize: 11, color: "#333333" }}>{r.companyEmail} · {r.companyPhone}</div>
            {r.companyGST && <div style={{ fontSize: 11, color: "#333333", marginTop: 2 }}>GSTIN: {r.companyGST}</div>}
          </div>
          <div style={{ textAlign: "right", minWidth: 220 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#1a56db", letterSpacing: 2, lineHeight: 1 }}>RECEIPT</div>
            <div style={{ marginTop: 6, display: "inline-block", padding: "3px 10px", borderRadius: 999, background: statusBg, color: statusFg, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              {statusLabel}
            </div>
            <div style={{ marginTop: 14, fontSize: 12 }}>
              <div style={{ color: "#6b7280" }}>Receipt #</div>
              <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6 }}>{r.receiptNumber}</div>
              <div style={{ color: "#6b7280" }}>Date</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{fmtDate(r.receiptDate)}</div>
              <div style={{ color: "#6b7280" }}>Invoice ref</div>
              <div style={{ fontWeight: 600 }}>{r.invoiceNumber}</div>
              <div style={{ color: "#6b7280", fontSize: 11 }}>Issued {fmtDate(r.invoiceDate)}</div>
            </div>
          </div>
        </div>

        <div style={DIVIDER} />

        {/* BILLED TO / RECEIPT DETAILS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <div style={SECTION_TITLE}>Billed to</div>
            <Row label="Client" value={<span style={{ fontWeight: 600 }}>{r.clientName}</span>} />
            <Row label="Email" value={r.clientEmail} />
            <Row label="Phone" value={r.clientPhone} />
            <Row label="Passport" value={maskPassport(r.passportNumber)} />
          </div>
          <div>
            <div style={SECTION_TITLE}>Receipt details</div>
            <Row label="Payment date" value={fmtDate(r.paymentDate)} />
            <Row label="Payment method" value={r.paymentMethod} />
            <Row label="Reference" value={r.paymentReference} />
            <Row label="Bank account" value={r.bankAccountNickname} />
            <Row label="Received by" value={r.counselorName} />
          </div>
        </div>

        <div style={DIVIDER} />

        {/* SERVICE DETAILS */}
        <div style={SECTION_TITLE}>Service details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <Row label="Service" value={<span style={{ fontWeight: 600 }}>{r.serviceType}</span>} />
            <Row label="Destination" value={r.destinationCountry} />
            <Row label="University" value={r.universityName} />
          </div>
          <div>
            <Row label="Program" value={r.programName} />
            <Row label="Intake" value={r.intakeMonth} />
            <Row label="Counselor" value={r.counselorName} />
            <Row label="Co-counselor" value={r.coCounselorName} />
          </div>
        </div>

        <div style={DIVIDER} />

        {/* PAYMENT BREAKDOWN */}
        <div style={SECTION_TITLE}>Payment breakdown</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: "6px 0", color: "#333333" }}>Subtotal</td>
              <td style={{ padding: "6px 0", textAlign: "right", color: "#333333" }}>{fmtReceiptAmount(r.subtotal, r.currency)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 0", color: "#333333" }}>Tax{r.taxCode ? ` (${r.taxCode})` : ""}</td>
              <td style={{ padding: "6px 0", textAlign: "right", color: "#333333" }}>{fmtReceiptAmount(r.taxAmount, r.currency)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 0", color: "#111827", fontWeight: 600, borderTop: "1px solid #e5e7eb" }}>Invoice total</td>
              <td style={{ padding: "6px 0", textAlign: "right", color: "#111827", fontWeight: 600, borderTop: "1px solid #e5e7eb" }}>{fmtReceiptAmount(r.invoiceTotal, r.currency)}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0 6px", color: "#111827", fontWeight: 700, fontSize: 18, borderTop: "2px solid #111827" }}>Amount received</td>
              <td style={{ padding: "12px 0 6px", textAlign: "right", color: "#111827", fontWeight: 700, fontSize: 18, borderTop: "2px solid #111827" }}>{fmtReceiptAmount(r.amountPaid, r.currency)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 0", color: "#333333" }}>Outstanding balance</td>
              <td style={{ padding: "6px 0", textAlign: "right", color: fullyPaid ? "#15803d" : "#dc2626", fontWeight: 700 }}>{fmtReceiptAmount(r.outstandingBalance, r.currency)}</td>
            </tr>
          </tbody>
        </table>

        {r.isInstalment && (
          <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderLeft: "3px solid #1a56db", fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: "#111827" }}>
              Instalment {r.instalmentNumber ?? "?"} of {r.totalInstalments ?? "?"}: {fmtReceiptAmount(r.amountPaid, r.currency)} received
            </div>
            <div style={{ color: "#333333", marginTop: 4 }}>
              Remaining balance: {fmtReceiptAmount(r.outstandingBalance, r.currency)}
            </div>
          </div>
        )}

        <div style={DIVIDER} />

        {/* FOOTER */}
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 11, marginTop: 8 }}>
          <div style={{ fontStyle: "italic", marginBottom: 10 }}>
            This receipt is computer generated and does not require a physical signature.
          </div>
          <div style={{ color: "#333333", fontSize: 12, marginBottom: 8 }}>
            Thank you for choosing Future Link Consultants. We wish you the very best in your journey ahead.
          </div>
          <div style={{ marginBottom: 4 }}>www.futurelinkconsultants.com</div>
          <div>{r.companyAddress}</div>
        </div>
      </div>
    </>
  );
}