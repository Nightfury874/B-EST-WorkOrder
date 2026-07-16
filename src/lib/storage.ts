import type { ChatMessage, VerdictState } from "./types";

export const initialVerdict: VerdictState = {
  issueCategory: "Unclear issue",
  issueLocation: "Not provided",
  currentStatus: "Unknown",
  severity: "staff_triage",
  safetyConcerns: [],
  missingInfo: ["Issue location", "When it started", "Current status", "Access details"],
  photoVideoStatus: "not_requested",
  safeStepsDiscussed: [],
  staffReviewRequired: false,
  staffReviewReason: [],
  likelyVendorCategory: "Staff triage",
  intakeComplete: false,
  possibleTenantCausedIndicators: [],
  complianceSensitiveFlags: [],
  accessDetails: {
    permissionToEnter: "unclear",
    occupied: "unclear",
    restrictedTimes: "",
    inaccessibleAreas: "",
    petsPresent: "unclear",
    petSecurePlan: "",
    alarmPresent: "unclear",
    alarmCodeHandling: "unclear",
    gateOrEntryNotes: "",
    parkingOrHoaNotes: "",
    contactPreference: "",
  },
  differentialAnalysis: [],
  costEstimation: "",
  repairpersonAdvice: "",
};

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessage(sender: ChatMessage["sender"], body: string, attachmentIds: string[] = []): ChatMessage {
  return {
    id: createId("msg"),
    sender,
    body,
    createdAt: new Date().toISOString(),
    ...(attachmentIds.length ? { attachmentIds } : {}),
  };
}
