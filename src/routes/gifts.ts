import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env.js";
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

const stringListSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return value;
  },
  z.array(z.string().trim().min(1).max(40))
);

const giftInputSchema = z.object({
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().trim().min(1).max(20),
  relation: z.string().trim().min(1).max(30),
  occasion: z.string().trim().max(60).optional(),
  hobbies: stringListSchema.default([]),
  interests: stringListSchema.default([]),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(1),
  mood: z.string().trim().max(30).optional(),
  categories: stringListSchema.default([]),
  extraContext: z.string().trim().max(800).optional(),
});

type GiftIdea = {
  name: string;
  category: string;
  reason: string;
  ranking: number;
  detail?: string;
};

const generatedGiftIdeaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(30),
  reason: z.string().trim().min(1).max(1000),
  ranking: z.coerce.number().int().min(1).max(20),
  detail: z.string().trim().max(1000).optional(),
});

const naverShoppingItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  image: z.string().url(),
  lprice: z.coerce.number().int().min(0),
  mallName: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  category1: z.string().optional().default(""),
  category2: z.string().optional().default(""),
  category3: z.string().optional().default(""),
  category4: z.string().optional().default(""),
});

const naverShoppingResponseSchema = z.object({
  items: z.array(naverShoppingItemSchema),
});

const naverErrorResponseSchema = z
  .object({
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
  })
  .passthrough();

type NaverShoppingApiError = Error & {
  naverStatus?: number;
  naverErrorCode?: string;
  naverErrorMessage?: string;
};

function parseJsonArray(text: string) {
  const match = text.match(/\[[\s\S]*\]/);
  return JSON.parse(match?.[0] ?? text) as unknown;
}

function parseGiftIdeas(text: string): GiftIdea[] {
  return z.array(generatedGiftIdeaSchema).min(1).max(10).parse(parseJsonArray(text));
}

function normalizeGiftIdeas(items: GiftIdea[]) {
  return [...items]
    .sort((a, b) => a.ranking - b.ranking)
    .map((item, index) => ({
      ...item,
      ranking: index + 1,
    }));
}

function giftIdeaPrompt(input: GiftInput) {
  return [
    "아토 앱의 선물 추천 후보를 JSON 배열로만 생성해줘.",
    "1개 이상 7개 이하로 추천해줘.",
    "너의 역할은 추천할 선물을 정하는 것까지만이야. 가격, 이미지 URL, 구매 URL은 절대 만들지 마.",
    "나이, 성별, 관계, 기념일/상황, 취미, 관심사, 예산, 선물 분위기, 카테고리, 기타 사항을 모두 고려해줘.",
    "각 항목 필드: name, category, reason, ranking, detail.",
    "name은 네이버 쇼핑에서 검색 가능한 구체적인 한국어 상품 검색어로 써줘.",
    "reason은 왜 이 선물을 추천하는지 한국어 한 문장으로 구체적으로 써줘.",
    `입력: ${JSON.stringify(input)}`,
  ].join("\n");
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeHttpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol === "http:") {
    url.protocol = "https:";
  }

  return url.toString();
}

async function isRenderableImageUrl(value: string) {
  try {
    let response = await fetch(value, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    if (response.status === 405) {
      response = await fetch(value, {
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(3000),
      });
    }

    const contentType = response.headers.get("content-type") ?? "";

    return (
      response.ok &&
      (contentType.startsWith("image/jpeg") ||
        contentType.startsWith("image/png") ||
        contentType.startsWith("image/webp"))
    );
  } catch {
    return false;
  }
}

function ensureNaverShoppingConfig() {
  if (!env.naverClientId || !env.naverClientSecret) {
    throw new Error("NAVER_SHOPPING_API_KEYS are not set");
  }
}

function shoppingQuery(item: Pick<GiftRecommendationItem, "name" | "category">) {
  return `${item.name} ${item.category}`.trim();
}

function shoppingCategory(item: z.infer<typeof naverShoppingItemSchema>, fallback: string) {
  return item.category4 || item.category3 || item.category2 || item.category1 || fallback;
}

async function searchShoppingProduct(
  item: Pick<GiftRecommendationItem, "name" | "category">,
  input: GiftInput
): Promise<z.infer<typeof naverShoppingItemSchema> | null> {
  ensureNaverShoppingConfig();

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", shoppingQuery(item));
  url.searchParams.set("display", "20");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "sim");
  url.searchParams.set("exclude", "used:rental:cbshop");

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": env.naverClientId,
      "X-Naver-Client-Secret": env.naverClientSecret,
    },
  });

  if (!response.ok) {
    const error = new Error("NAVER_SHOPPING_API_FAILED") as NaverShoppingApiError;
    error.naverStatus = response.status;

    const body = await response.text();
    try {
      const parsed = naverErrorResponseSchema.parse(JSON.parse(body));
      error.naverErrorCode = parsed.errorCode;
      error.naverErrorMessage = parsed.errorMessage;
    } catch {
      error.naverErrorMessage = body || response.statusText;
    }

    throw error;
  }

  const parsed = naverShoppingResponseSchema.parse(await response.json());
  const min = input.budgetMin ?? 0;
  const validProducts = parsed.items
    .filter((product) => product.lprice > 0 && product.lprice <= input.budgetMax && product.image && product.link)
    .sort((a, b) => {
      const aInBudget = a.lprice >= min ? 0 : 1;
      const bInBudget = b.lprice >= min ? 0 : 1;

      return aInBudget - bInBudget;
    });

  for (const product of validProducts) {
    const image = normalizeHttpsUrl(product.image);
    if (await isRenderableImageUrl(image)) {
      return { ...product, image };
    }
  }

  return null;
}

async function attachShoppingProducts(
  input: GiftInput,
  items: GiftIdea[]
): Promise<GiftRecommendationItem[]> {
  const resolved: GiftRecommendationItem[] = [];

  for (const item of items) {
    const product = await searchShoppingProduct(item, input);
    if (!product) {
      continue;
    }

    resolved.push({
      id: createId(),
      name: stripHtml(product.title),
      category: shoppingCategory(product, item.category),
      imageUrl: normalizeHttpsUrl(product.image),
      reason: item.reason,
      price: product.lprice,
      ranking: resolved.length + 1,
      detail: item.detail ?? `${product.mallName || "네이버 쇼핑"}에서 확인한 실제 상품입니다.`,
      purchaseUrl: product.link,
      saved: false,
    });

    if (resolved.length >= 5) {
      break;
    }
  }

  if (resolved.length === 0) {
    throw new Error("No matching shopping products found");
  }

  return resolved;
}

async function createGiftIdeas(input: GiftInput): Promise<GiftIdea[]> {
  const anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system: "You output only valid JSON. Do not include markdown, comments, or explanatory text.",
    messages: [
      {
        role: "user",
        content: giftIdeaPrompt(input),
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  try {
    return normalizeGiftIdeas(parseGiftIdeas(text));
  } catch {
    const repairResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: "You output only valid JSON. Do not include markdown, comments, or explanatory text.",
      messages: [
        {
          role: "user",
          content: [
            "다음 텍스트를 아래 스키마에 맞는 JSON 배열로만 변환해줘.",
            "스키마: [{\"name\":\"검색 가능한 한국어 상품명\",\"category\":\"카테고리\",\"reason\":\"추천 이유\",\"ranking\":1,\"detail\":\"선택 설명\"}]",
            "가격, 이미지 URL, 구매 URL은 넣지 마.",
            "배열 항목은 1개 이상 7개 이하로 맞춰줘.",
            text,
          ].join("\n"),
        },
      ],
    });
    const repairedText = repairResponse.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return normalizeGiftIdeas(parseGiftIdeas(repairedText));
  }
}

async function generateGiftItems(input: GiftInput): Promise<GiftRecommendationItem[]> {
  let ideas: GiftIdea[];
  try {
    ideas = await createGiftIdeas(input);
  } catch (error) {
    console.error("Gift idea generation failed", error);
    throw new Error("Gift idea generation failed");
  }

  try {
    return await attachShoppingProducts(input, ideas);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "NAVER_SHOPPING_API_FAILED" ||
        error.message === "No matching shopping products found")
    ) {
      throw error;
    }

    throw error;
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
