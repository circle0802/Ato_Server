import Anthropic from "@anthropic-ai/sdk";

import { env } from "../config/env.js";

export function createAnthropicClient() {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  return new Anthropic({
    apiKey: env.anthropicApiKey,
  });
}
