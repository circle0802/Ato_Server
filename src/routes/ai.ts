import { Router } from "express";
import { z } from "zod";

import { createAnthropicClient } from "../lib/anthropic.js";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

router.post("/chat", async (req, res, next) => {
  try {
    const { message } = chatRequestSchema.parse(req.body);
    const anthropic = createAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ text });
  } catch (error) {
    next(error);
  }
});

export default router;
