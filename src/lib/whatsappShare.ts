/**
 * Opens a WhatsApp share URL in a way that works inside an iframe (Lovable preview)
 * and standalone browsers.
 */
export function openWhatsApp(phone: string | null | undefined, message: string): void {
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message || "");
  const url = `https://wa.me/${cleanPhone}${text ? `?text=${text}` : ""}`;

  const inIframe = (() => {
    try { return window.top !== window.self; } catch { return true; }
  })();

  if (inIframe) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_top";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}