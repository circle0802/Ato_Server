import { Router } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  createAnniversary,
  deleteAnniversary,
  findAnniversary,
  listAnniversaries,
  updateAnniversary,
  type Anniversary,
} from "../lib/appDataStore.js";

const router = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const anniversarySchema = z.object({
  title: z.string().trim().min(1).max(60),
  targetName: z.string().trim().min(1).max(40),
  relation: z.string().trim().min(1).max(30),
  date: dateSchema,
  memo: z.string().trim().max(500).default(""),
  repeat: z.boolean().default(true),
  notificationEnabled: z.boolean().default(true),
  notificationDays: z.array(z.number().int().min(0).max(365)).default([7, 3, 0]),
});

const anniversaryUpdateSchema = anniversarySchema.partial();

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateFromYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
}

function nextOccurrence(anniversary: Anniversary, today = startOfToday()) {
  const original = dateFromYmd(anniversary.date);

  if (!anniversary.repeat) {
    return original;
  }

  const candidate = new Date(today.getFullYear(), original.getMonth(), original.getDate());

  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

function withDday(anniversary: Anniversary) {
  const nextDate = nextOccurrence(anniversary);

  return {
    ...anniversary,
    nextDate: toYmd(nextDate),
    dDay: daysBetween(startOfToday(), nextDate),
  };
}

function sortAnniversaries(anniversaries: ReturnType<typeof withDday>[], sort: string) {
  return [...anniversaries].sort((a, b) => {
    if (sort === "date") {
      return a.date.localeCompare(b.date);
    }

    return a.dDay - b.dDay;
  });
}

function upcomingOnly(anniversaries: ReturnType<typeof withDday>[]) {
  return anniversaries.filter((anniversary) => anniversary.dDay >= 0);
}

router.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const sort = z.enum(["date", "dday"]).default("dday").parse(req.query.sort ?? "dday");
    const anniversaries = (await listAnniversaries(authReq.auth.userId)).map(withDday);

    res.json({ anniversaries: sortAnniversaries(anniversaries, sort) });
  } catch (error) {
    next(error);
  }
});

router.get("/nearest", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const anniversaries = upcomingOnly((await listAnniversaries(authReq.auth.userId)).map(withDday));
    const [anniversary = null] = sortAnniversaries(anniversaries, "dday");

    res.json({ anniversary });
  } catch (error) {
    next(error);
  }
});

router.get("/upcoming", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const limit = z.coerce.number().int().min(1).max(50).default(5).parse(req.query.limit ?? 5);
    const anniversaries = (await listAnniversaries(authReq.auth.userId)).map(withDday);

    res.json({ anniversaries: sortAnniversaries(anniversaries, "dday").slice(0, limit) });
  } catch (error) {
    next(error);
  }
});

router.get("/calendar", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const year = z.coerce.number().int().min(1900).max(3000).parse(req.query.year);
    const month = z.coerce.number().int().min(1).max(12).parse(req.query.month);
    const anniversaries = (await listAnniversaries(authReq.auth.userId)).map(withDday);
    const calendar = anniversaries.filter((anniversary) => {
      const original = dateFromYmd(anniversary.date);
      const occurrence = anniversary.repeat ? new Date(year, original.getMonth(), original.getDate()) : original;

      return occurrence.getFullYear() === year && occurrence.getMonth() + 1 === month;
    });

    res.json({ year, month, anniversaries: sortAnniversaries(calendar, "date") });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const anniversary = await findAnniversary(authReq.auth.userId, req.params.id);

    if (!anniversary) {
      res.status(404).json({ error: "Anniversary not found" });
      return;
    }

    res.json({ anniversary: withDday(anniversary) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = anniversarySchema.parse(req.body);
    const anniversary = await createAnniversary({
      ...input,
      userId: authReq.auth.userId,
    });

    res.status(201).json({ anniversary: withDday(anniversary) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = anniversaryUpdateSchema.parse(req.body);
    const anniversary = await updateAnniversary(authReq.auth.userId, req.params.id, input);

    if (!anniversary) {
      res.status(404).json({ error: "Anniversary not found" });
      return;
    }

    res.json({ anniversary: withDday(anniversary) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const deleted = await deleteAnniversary(authReq.auth.userId, req.params.id);

    if (!deleted) {
      res.status(404).json({ error: "Anniversary not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
