import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";

export type Anniversary = {
  id: string;
  userId: string;
  title: string;
  targetName: string;
  relation: string;
  date: string;
  memo: string;
  repeat: boolean;
  notificationEnabled: boolean;
  notificationDays: number[];
  createdAt: string;
  updatedAt: string;
};

export type GiftInput = {
  age: number;
  gender: string;
  relation: string;
  hobbies: string[];
  interests: string[];
  budgetMin?: number;
  budgetMax: number;
  mood?: string;
  categories: string[];
};

export type GiftRecommendationItem = {
  id: string;
  name: string;
  category: string;
  reason: string;
  price: number;
  ranking: number;
  detail?: string;
  purchaseUrl?: string;
  saved: boolean;
};

export type GiftRecommendation = {
  id: string;
  userId: string;
  input: GiftInput;
  items: GiftRecommendationItem[];
  createdAt: string;
};

export type Message = {
  id: string;
  userId: string;
  content: string;
  relation: string;
  situation: string;
  tone: string;
  favorite: boolean;
  createdAt: string;
};

type AppDataFile = {
  anniversaries: Anniversary[];
  giftRecommendations: GiftRecommendation[];
  messages: Message[];
};

const dataDirectory = path.resolve(env.dataDirectory);
const appDataFilePath = path.join(dataDirectory, "app-data.json");

let writeQueue = Promise.resolve();

function defaultData(): AppDataFile {
  return {
    anniversaries: [],
    giftRecommendations: [],
    messages: [],
  };
}

async function readAppDataFile(): Promise<AppDataFile> {
  try {
    const content = await readFile(appDataFilePath, "utf8");
    return { ...defaultData(), ...(JSON.parse(content) as Partial<AppDataFile>) };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return defaultData();
    }

    throw error;
  }
}

async function writeAppDataFile(data: AppDataFile) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(appDataFilePath, JSON.stringify(data, null, 2), "utf8");
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

export function createId() {
  return randomUUID();
}

export async function listAnniversaries(userId: string) {
  const data = await readAppDataFile();
  return data.anniversaries.filter((anniversary) => anniversary.userId === userId);
}

export async function findAnniversary(userId: string, id: string) {
  return (await listAnniversaries(userId)).find((anniversary) => anniversary.id === id) ?? null;
}

export async function createAnniversary(input: Omit<Anniversary, "id" | "createdAt" | "updatedAt">) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const now = new Date().toISOString();
    const anniversary: Anniversary = {
      ...input,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };

    data.anniversaries.push(anniversary);
    await writeAppDataFile(data);
    return anniversary;
  });
}

export async function updateAnniversary(userId: string, id: string, input: Partial<Omit<Anniversary, "id" | "userId" | "createdAt" | "updatedAt">>) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const anniversary = data.anniversaries.find((candidate) => candidate.userId === userId && candidate.id === id);

    if (!anniversary) {
      return null;
    }

    Object.assign(anniversary, input, { updatedAt: new Date().toISOString() });
    await writeAppDataFile(data);
    return anniversary;
  });
}

export async function deleteAnniversary(userId: string, id: string) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const nextAnniversaries = data.anniversaries.filter(
      (anniversary) => anniversary.userId !== userId || anniversary.id !== id
    );

    if (nextAnniversaries.length === data.anniversaries.length) {
      return false;
    }

    data.anniversaries = nextAnniversaries;
    await writeAppDataFile(data);
    return true;
  });
}

export async function createGiftRecommendation(input: Omit<GiftRecommendation, "id" | "createdAt">) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const recommendation: GiftRecommendation = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
    };

    data.giftRecommendations.push(recommendation);
    await writeAppDataFile(data);
    return recommendation;
  });
}

export async function listGiftRecommendations(userId: string) {
  const data = await readAppDataFile();
  return data.giftRecommendations.filter((recommendation) => recommendation.userId === userId);
}

export async function findGiftRecommendation(userId: string, id: string) {
  return (await listGiftRecommendations(userId)).find((recommendation) => recommendation.id === id) ?? null;
}

export async function updateGiftItemSaved(userId: string, recommendationId: string, itemId: string, saved: boolean) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const recommendation = data.giftRecommendations.find(
      (candidate) => candidate.userId === userId && candidate.id === recommendationId
    );
    const item = recommendation?.items.find((candidate) => candidate.id === itemId);

    if (!recommendation || !item) {
      return null;
    }

    item.saved = saved;
    await writeAppDataFile(data);
    return recommendation;
  });
}

export async function createMessage(input: Omit<Message, "id" | "createdAt">) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const message: Message = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
    };

    data.messages.push(message);
    await writeAppDataFile(data);
    return message;
  });
}

export async function listMessages(userId: string) {
  const data = await readAppDataFile();
  return data.messages.filter((message) => message.userId === userId);
}

export async function updateMessage(userId: string, id: string, input: Pick<Partial<Message>, "favorite" | "content">) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const message = data.messages.find((candidate) => candidate.userId === userId && candidate.id === id);

    if (!message) {
      return null;
    }

    Object.assign(message, input);
    await writeAppDataFile(data);
    return message;
  });
}

export async function deleteMessage(userId: string, id: string) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    const nextMessages = data.messages.filter((message) => message.userId !== userId || message.id !== id);

    if (nextMessages.length === data.messages.length) {
      return false;
    }

    data.messages = nextMessages;
    await writeAppDataFile(data);
    return true;
  });
}

export async function deleteUserAppData(userId: string) {
  return enqueueWrite(async () => {
    const data = await readAppDataFile();
    data.anniversaries = data.anniversaries.filter((anniversary) => anniversary.userId !== userId);
    data.giftRecommendations = data.giftRecommendations.filter((recommendation) => recommendation.userId !== userId);
    data.messages = data.messages.filter((message) => message.userId !== userId);
    await writeAppDataFile(data);
  });
}
