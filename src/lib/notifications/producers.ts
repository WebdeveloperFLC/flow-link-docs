// Cross-module producer stubs. Wire-only — call from future modules.
// Each producer is a thin wrapper around emitNotification with the right event type.
import { emitNotification } from "./eventBus";

export const produce = {
  leadAssigned: (userIds: string[], p: { leadId: string; leadName?: string }) =>
    userIds.forEach((uid) => emitNotification("lead.assigned", { userIds: [uid], userId: uid, ...p })),

  leadConverted: (userIds: string[], p: { leadId: string; clientId: string; clientName?: string }) =>
    emitNotification("lead.converted", { userIds, ...p }),

  documentUploaded: (userIds: string[], p: { documentId: string; fileName: string; clientId?: string }) =>
    emitNotification("document.uploaded", { userIds, ...p }),

  ocrCompleted: (userIds: string[], p: { documentId: string; fileName: string; clientId?: string }) =>
    emitNotification("document.ocr_completed", { userIds, ...p }),

  binderGenerated: (userIds: string[], p: { binderId: string; binderName: string; clientId?: string }) =>
    emitNotification("binder.generated", { userIds, ...p }),

  portalInviteAccepted: (userIds: string[], p: { inviteId: string; clientId: string }) =>
    emitNotification("portal.invite_accepted", { userIds, ...p }),

  workflowStageChanged: (userIds: string[], p: { clientId: string; stage: string }) =>
    emitNotification("workflow.stage_changed", { userIds, ...p }),

  telecallerFollowupAssigned: (userIds: string[], p: { followupId: string; clientId: string; dueAt?: string }) =>
    emitNotification("telecaller.followup_assigned", { userIds, ...p }),
};