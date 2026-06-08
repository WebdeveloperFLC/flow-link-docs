/** Build the canonical service code stored on leads/clients (matches fetchAllServiceCatalogue). */
export function buildServiceCode(libraryId: string, country: string | null | undefined): string {
  const c = country?.trim();
  return c ? `${libraryId}::${c}` : libraryId;
}

export function buildServiceLibraryParams(opts: {
  libraryId: string;
  country: string | null;
  serviceTitle: string;
  serviceCode: string;
  subService?: string;
}) {
  const p = new URLSearchParams();
  p.set("library_id", opts.libraryId);
  if (opts.country) p.set("country", opts.country);
  p.set("visa_service", opts.serviceCode);
  p.set("service_label", opts.serviceTitle);
  if (opts.subService) p.set("sub_service", opts.subService);
  return p;
}
