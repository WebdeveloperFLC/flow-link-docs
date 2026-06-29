// Bundle all knowledge markdown files into a single string sent to the edge function.
const modules = import.meta.glob("../knowledge/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const CRM_KNOWLEDGE: string = Object.keys(modules)
  .sort()
  .map((k) => modules[k])
  .join("\n\n---\n\n");
