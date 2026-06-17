/** Build the canonical service code stored on leads/clients (matches fetchAllServiceCatalogue). */
export function buildServiceCode(libraryId: string, country: string | null | undefined): string {
  const c = country?.trim();
  return c ? `${libraryId}::${c}` : libraryId;
}

export type ServiceLibraryCategory = "visa" | "coaching";

/** Build deep-link back to a service in the academy. */
export function buildServiceLibraryUrl(opts: {
  libraryId: string;
  country?: string | null;
  cat?: ServiceLibraryCategory | null;
  family?: string | null;
  variant?: "general" | "academic" | "other" | null;
  tab?: string;
}) {
  const p = new URLSearchParams();
  p.set("id", opts.libraryId);
  if (opts.cat === "coaching") p.set("cat", "coaching");
  if (opts.family) p.set("family", opts.family);
  if (opts.variant) p.set("variant", opts.variant);
  if (opts.country) p.set("country", opts.country);
  if (opts.tab) p.set("tab", opts.tab);
  return `/service-library?${p.toString()}`;
}

/** library id prefix from stored service code (`uuid::Country`). */
export function parseLibraryIdFromServiceCode(serviceCode: string | null | undefined): string | null {
  if (!serviceCode) return null;
  const idx = serviceCode.indexOf("::");
  return idx > 0 ? serviceCode.slice(0, idx) : serviceCode;
}

export function appendServiceLibraryClientContext(
  params: URLSearchParams,
  opts: { libraryId: string; country?: string | null },
) {
  params.set("from", "service-library");
  params.set("library_id", opts.libraryId);
  if (opts.country) params.set("sl_country", opts.country);
  return params;
}

export function buildServiceLibraryParams(opts: {
  libraryId: string;
  country: string | null;
  serviceTitle: string;
  serviceCode: string;
  subService?: string;
  serviceCategory?: string | null;
}) {
  const p = new URLSearchParams();
  p.set("from", "service-library");
  p.set("library_id", opts.libraryId);
  if (opts.country) {
    p.set("country", opts.country);
    p.set("sl_country", opts.country);
  }
  p.set("visa_service", opts.serviceCode);
  p.set("service_label", opts.serviceTitle);
  if (opts.subService) p.set("sub_service", opts.subService);
  if (opts.serviceCategory === "coaching_services") p.set("cat", "coaching");
  return p;
}

export function buildClientDetailUrlFromServiceLibrary(opts: {
  clientId: string;
  libraryId: string;
  country?: string | null;
  serviceCode?: string | null;
}) {
  const p = appendServiceLibraryClientContext(new URLSearchParams(), {
    libraryId: opts.libraryId,
    country: opts.country,
  });
  if (opts.serviceCode) p.set("service", opts.serviceCode);
  return `/clients/${opts.clientId}?${p.toString()}`;
}
