import { Router } from "express";
import { z } from "zod";

import { listAnniversaries } from "../lib/appDataStore.js";
import { findUserById, updateUser } from "../lib/userStore.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

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

function nextOccurrence(date: string, repeat: boolean) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const original = dateFromYmd(date);

  if (!repeat) {
    return original;
  }

  const candidate = new Date(today.getFullYear(), original.getMonth(), original.getDate());

  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

router.get("/settings", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await findUserById(authReq.auth.userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ notificationEnabled: user.notificationEnabled ?? true });
  } catch (error) {
    next(error);
  }
});

router.patch("/settings", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { notificationEnabled } = z.object({ notificationEnabled: z.boolean() }).parse(req.body);
    const result = await updateUser(authReq.auth.userId, { notificationEnabled });

    if (result.status === "not-found") {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (result.status !== "updated") {
      res.status(500).json({ error: "Failed to update notification settings" });
      return;
    }

    res.json({ notificationEnabled: result.user.notificationEnabled ?? true });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await findUserById(authReq.auth.userId);
    const userNotificationEnabled = user?.notificationEnabled ?? true;
    const anniversaries = await listAnniversaries(authReq.auth.userId);
    const notifications = anniversaries
      .filter((anniversary) => userNotificationEnabled && anniversary.notificationEnabled)
      .flatMap((anniversary) => {
        const occurrence = nextOccurrence(anniversary.date, anniversary.repeat);

        return anniversary.notificationDays.map((daysBefore) => {
          const notifyAt = new Date(occurrence);
          notifyAt.setDate(occurrence.getDate() - daysBefore);

          return {
            anniversaryId: anniversary.id,
            title: anniversary.title,
            targetName: anniversary.targetName,
            relation: anniversary.relation,
            daysBefore,
            notifyDate: toYmd(notifyAt),
            anniversaryDate: toYmd(occurrence),
          };
        });
      })
      .sort((a, b) => a.notifyDate.localeCompare(b.notifyDate));

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

export default router;
