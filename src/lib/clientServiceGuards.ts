export type PipelineProgressSnapshot = {
  pipeline_id?: string | null;
  progress_percent?: number | null;
  stage_order?: number | null;
  stage_key?: string | null;
};

/**
 * @deprecated Use {@link isServiceRemovalRestricted} from clientProcessPolicy.
 * Pipeline progress and outstanding payment never block service edits.
 */
export function isActiveApplicationInProgress(_progress: PipelineProgressSnapshot | null | undefined): boolean {
  return false;
}

/** @deprecated Service removal is no longer restricted by pipeline progress. */
export function serviceRemovalBlockedMessage(_progress: PipelineProgressSnapshot): string {
  return "";
}
