import caseIndex from "@/data/caseIndex.json";
import type { ConversationRecord } from "./types";

export type CaseCitation = {
  workOrderNumber: string;
  sourceYear: string;
  sourceFile: string;
  sourceRow: string;
  issueCategory: string;
  normalizedUrgency: string;
  specialty: string;
  likelyVendorCategory: string;
  symptomSummary: string;
  whySimilar: string;
};

type RawCase = Omit<CaseCitation, "whySimilar"> & {
  confidenceScore?: string;
};

const cases = caseIndex as RawCase[];
const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "are",
  "was",
  "were",
  "not",
  "now",
  "issue",
  "problem",
  "please",
  "tenant",
]);

export function getSimilarCaseCitations(conversation: ConversationRecord, limit = 5): CaseCitation[] {
  const tenantText = conversation.messages
    .filter((message) => message.sender === "tenant")
    .map((message) => message.body)
    .join(" ");
  const queryTokens = tokenize(`${conversation.verdict.issueCategory} ${conversation.verdict.issueLocation} ${tenantText}`);

  return cases
    .map((item) => {
      const categoryScore = item.issueCategory === conversation.verdict.issueCategory ? 12 : 0;
      const urgencyScore = item.normalizedUrgency.toLowerCase() === conversation.verdict.severity ? 3 : 0;
      const textScore = overlapScore(queryTokens, tokenize(`${item.issueCategory} ${item.symptomSummary} ${item.specialty} ${item.likelyVendorCategory}`));
      return {
        item,
        score: categoryScore + urgencyScore + textScore,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      ...item,
      whySimilar: buildWhySimilar(item, conversation),
    }));
}

export function formatCaseCitations(citations: CaseCitation[]) {
  if (!citations.length) {
    return "- No similar sanitized historical cases found for this issue yet.";
  }

  return citations
    .map(
      (item) =>
        `- WO ${item.workOrderNumber || "unknown"}, ${item.sourceYear || "year unknown"}, ${item.issueCategory}, ${item.normalizedUrgency}. ${item.whySimilar} Source: ${item.sourceFile} row ${item.sourceRow || "unknown"}.`,
    )
    .join("\n");
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function overlapScore(a: string[], b: string[]) {
  const target = new Set(b);
  return a.reduce((score, token) => score + (target.has(token) ? 1 : 0), 0);
}

function buildWhySimilar(item: RawCase, conversation: ConversationRecord) {
  if (item.issueCategory === conversation.verdict.issueCategory) {
    return `Same issue category with similar symptoms: ${item.symptomSummary}`;
  }
  return `Related historical symptoms: ${item.symptomSummary}`;
}
