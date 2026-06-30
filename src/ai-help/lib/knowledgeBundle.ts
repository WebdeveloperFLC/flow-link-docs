import { AI_HELP_KNOWLEDGE_BY_FILE } from "./crmKnowledge.generated";

export const CRM_KNOWLEDGE: string = Object.keys(AI_HELP_KNOWLEDGE_BY_FILE)
  .sort()
  .map((k) => AI_HELP_KNOWLEDGE_BY_FILE[k])
  .join("\n\n---\n\n");
