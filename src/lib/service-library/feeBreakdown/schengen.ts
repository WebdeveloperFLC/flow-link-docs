import { schengenStudent, schengenVisitor } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const VFS = (country: string) =>
  `VFS/TLS ${country} — service fee varies by centre (India: check vfs-global.com)`;

export const SCHENGEN_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  schengenStudent("b2000001-0001-4000-8000-000000000081", "France", VFS("France")),
  schengenVisitor("b2000001-0001-4000-8000-000000000082", "France", VFS("France")),
  schengenStudent("b2000001-0001-4000-8000-000000000091", "Italy", VFS("Italy")),
  schengenVisitor("b2000001-0001-4000-8000-000000000092", "Italy", VFS("Italy")),
  schengenStudent("b2000001-0001-4000-8000-0000000000a1", "Netherlands", VFS("Netherlands")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000a2", "Netherlands", VFS("Netherlands")),
  schengenStudent("b2000001-0001-4000-8000-0000000000a5", "Spain", VFS("Spain")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000a6", "Spain", VFS("Spain")),
  schengenStudent("b2000001-0001-4000-8000-0000000000a7", "Malta", VFS("Malta")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000a8", "Malta", VFS("Malta")),
  schengenStudent("b2000001-0001-4000-8000-0000000000a9", "Finland", VFS("Finland")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000aa", "Finland", VFS("Finland")),
  schengenStudent("b2000001-0001-4000-8000-0000000000ab", "Sweden", VFS("Sweden")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000ac", "Sweden", VFS("Sweden")),
  schengenStudent("b2000001-0001-4000-8000-0000000000ad", "Austria", VFS("Austria")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000ae", "Austria", VFS("Austria")),
  schengenStudent("b2000001-0001-4000-8000-0000000000af", "Belgium", VFS("Belgium")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000b0", "Belgium", VFS("Belgium")),
  schengenStudent("b2000001-0001-4000-8000-0000000000b1", "Denmark", VFS("Denmark")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000b2", "Denmark", VFS("Denmark")),
  schengenStudent("b2000001-0001-4000-8000-0000000000b3", "Portugal", VFS("Portugal")),
  schengenVisitor("b2000001-0001-4000-8000-0000000000b4", "Portugal", VFS("Portugal")),
];
