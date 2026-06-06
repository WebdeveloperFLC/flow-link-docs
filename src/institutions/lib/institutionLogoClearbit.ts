/** Free Clearbit logo probe — works in the browser without an edge function. */

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

export function clearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

/** Returns the Clearbit URL if the logo loads, otherwise null. */
export function probeClearbitLogo(websiteUrl: string, timeoutMs = 6000): Promise<string | null> {
  const domain = domainFromWebsite(websiteUrl);
  if (!domain) return Promise.resolve(null);
  const url = clearbitLogoUrl(domain);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(null);
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(url);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}
