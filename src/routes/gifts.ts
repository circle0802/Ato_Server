import { Router } from "express";
import { z } from "zod";

import { createAnthropicClient } from "../lib/anthropic.js";
import {
  createGiftRecommendation,
  createId,
  findGiftRecommendation,
  listGiftRecommendations,
  updateGiftItemSaved,
  type GiftInput,
  type GiftRecommendationItem,
} from "../lib/appDataStore.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const giftInputSchema = z.object({
  age: z.number().int().min(1).max(120),
  gender: z.string().trim().min(1).max(20),
  relation: z.string().trim().min(1).max(30),
  hobbies: z.array(z.string().trim().min(1).max(40)).default([]),
  interests: z.array(z.string().trim().min(1).max(40)).default([]),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(1),
  mood: z.string().trim().max(30).optional(),
  categories: z.array(z.string().trim().min(1).max(30)).default([]),
});

const generatedGiftItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(30),
  reason: z.string().trim().min(1).max(500),
  price: z.number().int().min(0),
  ranking: z.number().int().min(1).max(20),
  detail: z.string().trim().max(800).optional(),
  purchaseUrl: z.string().url().optional(),
});

function parseJsonArray(text: string) {
  const match = text.match(/\[[\s\S]*\]/);
  return JSON.parse(match?.[0] ?? text) as unknown;
}

function fallbackGiftItems(input: GiftInput): GiftRecommendationItem[] {
  const category = input.categories[0] ?? "라이프스타일";
  const hobby = input.hobbies[0] ?? input.interests[0] ?? "취향";

  return [
    {
      id: createId(),
      name: `${hobby} 맞춤 선물`,
      category,
      reason: `${input.relation}에게 부담 없이 건네기 좋은 ${input.mood ?? "실용적인"} 선물입니다.`,
      price: input.budgetMax,
      ranking: 1,
      detail: "AI 응답을 구조화하지 못해 기본 추천으로 저장했습니다.",
      saved: false,
    },
  ];
}

async function generateGiftItems(input: GiftInput): Promise<GiftRecommendationItem[]> {
  const anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          "아토 앱의 선물 추천 결과를 JSON 배열로만 생성해줘.",
          "각 항목 필드: name, category, reason, price, ranking, detail.",
          `입력: ${JSON.stringify(input)}`,
        ].join("\n"),
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  try {
    const parsed = z.array(generatedGiftItemSchema).min(1).max(10).parse(parseJsonArray(text));
    return [...parsed]
      .sort((a, b) => a.ranking - b.ranking)
      .map((item) => ({
        ...item,
        id: createId(),
        saved: false,
      }));
  } catch {
    return fallbackGiftItems(input);
  }
}

router.post("/recommendations", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = giftInputSchema.parse(req.body);

    if (input.budgetMin !== undefined && input.budgetMin > input.budgetMax) {
      res.status(400).json({ error: "budgetMin cannot be greater than budgetMax" });
      return;
    }

    const items = await generateGiftItems(input);
    const recommendation = await createGiftRecommendation({
      userId: authReq.auth.userId,
      input,
      items,
    });

    res.status(201).json({ recommendation });
  } catch (error) {
    next(error);
  }
});

router.get("/recommendations", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const sort = z.enum(["createdAt", "price", "ranking"]).default("createdAt").parse(req.query.sort ?? "createdAt");
    const category = z.string().trim().optional().parse(req.query.category);
    const recommendations = await listGiftRecommendations(authReq.auth.userId);

    const mapped = recommendations
      .map((recommendation) => ({
        ...recommendation,
        items: [...recommendation.items]
          .filter((item) => !category || item.category === category)
          .sort((a, b) => {
            if (sort === "price") return a.price - b.price;
            if (sort === "ranking") return a.ranking - b.ranking;
            return 0;
          }),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ recommendations: mapped });
  } catch (error) {
    next(error);
  }
});

router.get("/recommendations/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const recommendation = await findGiftRecommendation(authReq.auth.userId, req.params.id);

    if (!recommendation) {
      res.status(404).json({ error: "Gift recommendation not found" });
      return;
    }

    res.json({ recommendation });
  } catch (error) {
    next(error);
  }
});

router.patch("/recommendations/:id/items/:itemId", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { saved } = z.object({ saved: z.boolean() }).parse(req.body);
    const recommendation = await updateGiftItemSaved(authReq.auth.userId, req.params.id, req.params.itemId, saved);

    if (!recommendation) {
      res.status(404).json({ error: "Gift recommendation item not found" });
      return;
    }

    res.json({ recommendation });
  } catch (error) {
    next(error);
  }
});

export default router;
