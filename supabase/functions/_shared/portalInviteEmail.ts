const SITE_NAME = "Future Link Consultants";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildPortalInviteEmail(args: { link: string; clientName?: string | null }) {
  const heading = args.clientName
    ? `Welcome, ${args.clientName}!`
    : "Welcome to your client portal";
  const subject = "You've been invited to your client portal";
  const text = [
    heading,
    "",
    `Your counselor at ${SITE_NAME} has invited you to your secure client portal.`,
    "From there you can track application status, upload documents, chat with your team, view offers, and manage payments.",
    "",
    `Activate your portal: ${args.link}`,
    "",
    "This invitation link expires in 14 days.",
    "",
    `— The ${SITE_NAME} team`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#444;">
    <div style="max-width:560px;margin:0 auto;">
      <h1 style="font-size:22px;color:#111827;margin:0 0 16px;">${escapeHtml(heading)}</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
        Your counselor at ${SITE_NAME} has invited you to your secure client portal.
        From there, you can track your application status, upload documents, chat with
        your team, view offers, and manage payments.
      </p>
      <p style="text-align:center;margin:30px 0;">
        <a href="${escapeHtml(args.link)}" style="background:#1d4ed8;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">
          Activate my portal
        </a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#777;margin:0 0 12px;">
        Or paste this link into your browser:<br />
        <span style="word-break:break-all;">${escapeHtml(args.link)}</span>
      </p>
      <p style="font-size:12px;color:#777;margin:0 0 12px;">This invitation link expires in 14 days.</p>
      <p style="font-size:12px;color:#999;margin:30px 0 0;">— The ${SITE_NAME} team</p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}
