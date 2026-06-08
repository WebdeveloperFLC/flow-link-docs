export interface TemplateItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string;
}

export interface TemplateGroup {
  id: string;
  section_key: string;
  label: string;
  sort_order: number;
  item_ids: string[];
}

export interface Template {
  id: string;
  name: string;
  country: string;
  category: string;
  version: number;
  items: TemplateItem[];
  created_at: string;
  groups?: TemplateGroup[] | null;
}
