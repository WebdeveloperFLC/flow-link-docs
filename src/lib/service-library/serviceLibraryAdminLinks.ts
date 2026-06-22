/** Deep link to Document structure editor for a Service Library record. */
export function serviceLibraryDocumentStructureAdminUrl(
  libraryId: string,
  country?: string | null,
): string {
  const params = new URLSearchParams({
    id: libraryId,
    detailTab: "documentstructure",
  });
  if (country?.trim()) params.set("country", country.trim());
  return `/service-library-admin?${params.toString()}`;
}

/** Deep link to Service Library Admin for a specific record. */
export function serviceLibraryAdminUrl(libraryId: string, country?: string | null): string {
  const params = new URLSearchParams({ id: libraryId });
  if (country?.trim()) params.set("country", country.trim());
  return `/service-library-admin?${params.toString()}`;
}
