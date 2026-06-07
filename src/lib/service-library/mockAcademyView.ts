import { SERVICE_LIBRARY_METADATA_TEMPLATE } from "./academyTypes";
import { buildAcademyViewModel, type AcademyViewModel } from "./buildAcademyViewModel";
import type { Master } from "@/lib/serviceLibrary";

/** Static view model for /service-library/preview only. */
export function buildMockAcademyViewModel(): AcademyViewModel {
  const master = {
    id: "preview",
    service_category: "visa_immigration",
    service: "Student Visa",
    sub_service: "Study Permit",
    academy_metadata: SERVICE_LIBRARY_METADATA_TEMPLATE,
    quick_guide_what_to_do: null,
    quick_guide_common_mistakes: null,
    quick_guide_escalation_rules: null,
    quick_guide_important_reminders: null,
    checklist_text: null,
    cost_summary_html: null,
    internal_sop_html: null,
    process_flow: null,
    display_order: 0,
    is_active: true,
  } as Master;

  return buildAcademyViewModel({
    master,
    override: null,
    country: "Canada",
    countries: ["Canada"],
    feeItems: [],
    submissionItems: [],
    checklistFiles: [],
    attachments: [],
    sopTasks: [],
    submissionCompletedIds: new Set(),
    relatedMasters: [
      { id: "preview-2", label: "Canada – PGWP" },
      { id: "preview-3", label: "Canada – Visitor Visa" },
    ],
  });
}
