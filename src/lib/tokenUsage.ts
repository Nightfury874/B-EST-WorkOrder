import type { TokenUsage } from "./types";

export const emptyTokenUsage: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export function addTokenUsage(...items: Array<TokenUsage | undefined>): TokenUsage {
  return items.reduce<TokenUsage>(
    (total, item) => ({
      inputTokens: total.inputTokens + (item?.inputTokens ?? 0),
      outputTokens: total.outputTokens + (item?.outputTokens ?? 0),
      totalTokens: total.totalTokens + (item?.totalTokens ?? 0),
    }),
    { ...emptyTokenUsage },
  );
}
