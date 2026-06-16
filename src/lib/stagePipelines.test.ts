import { describe, expect, it } from "vitest";
import {
  groupPipelineStagesByPipelineId,
  nextPipelineStageSortOrder,
  type PipelineStageRow,
} from "@/lib/stagePipelines";

const stage = (overrides: Partial<PipelineStageRow> & Pick<PipelineStageRow, "id" | "pipeline_id" | "key">): PipelineStageRow => ({
  label: overrides.key,
  sort_order: 10,
  color: null,
  notify_client: false,
  is_client_visible: true,
  client_label: null,
  ...overrides,
});

describe("groupPipelineStagesByPipelineId", () => {
  it("groups and preserves order within a pipeline", () => {
    const rows = [
      stage({ id: "1", pipeline_id: "p1", key: "a", sort_order: 10 }),
      stage({ id: "2", pipeline_id: "p2", key: "b", sort_order: 10 }),
      stage({ id: "3", pipeline_id: "p1", key: "c", sort_order: 20 }),
    ];
    const grouped = groupPipelineStagesByPipelineId(rows);
    expect(grouped.p1?.map((s) => s.key)).toEqual(["a", "c"]);
    expect(grouped.p2?.map((s) => s.key)).toEqual(["b"]);
  });
});

describe("nextPipelineStageSortOrder", () => {
  it("uses max sort_order + 10", () => {
    const rows = [
      stage({ id: "1", pipeline_id: "p1", key: "a", sort_order: 10 }),
      stage({ id: "2", pipeline_id: "p1", key: "b", sort_order: 85 }),
    ];
    expect(nextPipelineStageSortOrder(rows)).toBe(95);
  });

  it("defaults to 10 when empty", () => {
    expect(nextPipelineStageSortOrder([])).toBe(10);
  });
});
