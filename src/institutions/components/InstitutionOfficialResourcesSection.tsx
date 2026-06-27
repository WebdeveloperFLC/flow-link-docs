import {
  buildInstitutionOfficialResourcesPatch,
  readInstitutionOfficialResources,
} from "../lib/officialResources";
import type { UpiInstitution } from "../types/upi";
import type { InstitutionOfficialResources } from "../types/officialResources";
import { OfficialResourcesPanel } from "./OfficialResourcesPanel";

type Props = {
  inst: UpiInstitution;
  canEdit: boolean;
  onChange: (patch: Partial<UpiInstitution>) => void;
  onSave: (patch: Partial<UpiInstitution>) => Promise<void>;
};

export function InstitutionOfficialResourcesSection({ inst, canEdit, onChange, onSave }: Props) {
  const resources = readInstitutionOfficialResources(inst);

  const update = (patch: Partial<InstitutionOfficialResources>) => {
    const merged = { ...resources, ...patch };
    onChange(buildInstitutionOfficialResourcesPatch(inst, merged));
  };

  const save = async (patch: Partial<InstitutionOfficialResources>) => {
    const merged = { ...resources, ...patch };
    await onSave(buildInstitutionOfficialResourcesPatch(inst, merged));
  };

  return (
    <OfficialResourcesPanel
      scope="institution"
      institutionResources={resources}
      canEdit={canEdit}
      onInstitutionChange={update}
      onInstitutionSave={save}
      className="max-w-3xl p-6"
    />
  );
}
