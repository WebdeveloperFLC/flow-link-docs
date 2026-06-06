/** Browser-side logo probes — no edge function required. */

const LOGO_DEV_TOKEN = import.meta.env.VITE_LOGO_DEV_TOKEN as string | undefined;

export function domainFromWebsite(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function logoCandidateUrls(websiteUrl: string): string[] {
  const domain = domainFromWebsite(websiteUrl);
  if (!domain) return [];

  const urls: string[] = [];
  if (LOGO_DEV_TOKEN?.trim()) {
    urls.push(`https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(LOGO_DEV_TOKEN.trim())}&size=128`);
  }
  urls.push(
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  );
  return urls;
}

function probeImageUrl(url: string, timeoutMs = 7000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth >= 16 && img.naturalHeight >= 16);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

/** Returns the first working logo URL, or null. */
export async function probeLogoFromWebsite(websiteUrl: string): Promise<string | null> {
  for (const url of logoCandidateUrls(websiteUrl)) {
    if (await probeImageUrl(url)) return url;
  }
  return null;
}
