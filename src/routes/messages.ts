import { Router } from "express";
import { z } from "zod";

import { createAnthropicClient } from "../lib/anthropic.js";
import { createMessage, deleteMessage, listMessages, updateMessage } from "../lib/appDataStore.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const messageGenerateSchema = z.object({
  relation: z.string().trim().min(1).max(30),
  situation: z.string().trim().min(1).max(80),
  tone: z.string().trim().min(1).max(30),
  targetName: z.string().trim().max(40).optional(),
  extraContext: z.string().trim().max(500).optional(),
});

async function generateMessage(input: z.infer<typeof messageGenerateSchema>) {
  const anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          "아토 앱에서 사용할 한국어 축하 메시지를 하나만 작성해줘.",
          "너무 길지 않게 2~4문장으로 자연스럽게 작성해줘.",
          `입력: ${JSON.stringify(input)}`,
        ].join("\n"),
      },
    ],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

router.post("/generate", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = messageGenerateSchema.parse(req.body);
    const content = await generateMessage(input);
    const message = await createMessage({
      userId: authReq.auth.userId,
      content,
      relation: input.relation,
      situation: input.situation,
      tone: input.tone,
      favorite: false,
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const favorite = z.coerce.boolean().optional().parse(req.query.favorite);
    const messages = (await listMessages(authReq.auth.userId))
      .filter((message) => favorite === undefined || message.favorite === favorite)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = z
      .object({
        favorite: z.boolean().optional(),
        content: z.string().trim().min(1).max(1000).optional(),
      })
      .parse(req.body);
    const message = await updateMessage(authReq.auth.userId, req.params.id, input);

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.json({ message });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const deleted = await deleteMessage(authReq.auth.userId, req.params.id);

    if (!deleted) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
