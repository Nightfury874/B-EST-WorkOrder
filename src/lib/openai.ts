import OpenAI from "openai";
import type { TokenUsage } from "./types";

export type CompletionResult<T> = {
  value: T;
  tokenUsage: TokenUsage;
};

const apiKey = process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
  apiKey: apiKey || "placeholder_key_if_missing",
});

export const modelName = process.env.AI_MODEL || "gpt-4o";

function isUnavailableModelError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; message?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  return candidate.status === 404 || message.includes("model") || message.includes("exist");
}

function readTokenUsage(usage: OpenAI.Completions.CompletionUsage | undefined): TokenUsage {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}

export async function generateJsonCompletion<T>(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<CompletionResult<T>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in environment variables");
  }

  const actualModel = modelName;
  try {
    const response = await openai.chat.completions.create({
      model: actualModel,
      messages,
      response_format: {
        type: "json_object"
      },
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("Empty response from OpenAI");
    }
    return {
      value: JSON.parse(text) as T,
      tokenUsage: readTokenUsage(response.usage),
    };
  } catch (error: unknown) {
    if (actualModel !== "gpt-4o" && isUnavailableModelError(error)) {
      console.warn(`Model ${actualModel} not found or failed. Retrying with gpt-4o...`);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: {
          type: "json_object"
        },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("Empty response from OpenAI");
      }
      return {
        value: JSON.parse(text) as T,
        tokenUsage: readTokenUsage(response.usage),
      };
    }
    throw error;
  }
}

export async function generateTextCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<CompletionResult<string>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in environment variables");
  }

  const actualModel = modelName;
  try {
    const response = await openai.chat.completions.create({
      model: actualModel,
      messages,
    });
    return {
      value: response.choices[0]?.message?.content || "",
      tokenUsage: readTokenUsage(response.usage),
    };
  } catch (error: unknown) {
    if (actualModel !== "gpt-4o" && isUnavailableModelError(error)) {
      console.warn(`Model ${actualModel} not found or failed. Retrying with gpt-4o...`);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
      });
      return {
        value: response.choices[0]?.message?.content || "",
        tokenUsage: readTokenUsage(response.usage),
      };
    }
    throw error;
  }
}
