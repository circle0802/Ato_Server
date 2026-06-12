import { Router } from "express";
import { z } from "zod";

import { deleteUser, findUserById, updateUser } from "../lib/userStore.js";
import { deleteUserAppData, listGiftRecommendations, listMessages } from "../lib/appDataStore.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function toUserResponse(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  return {
    id: user.id,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl ?? null,
    notificationEnabled: user.notificationEnabled ?? true,
    createdAt: user.createdAt,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await findUserById(authReq.auth.userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile-image", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { profileImageUrl } = z.object({ profileImageUrl: z.string().url().nullable() }).parse(req.body);
    const result = await updateUser(authReq.auth.userId, { profileImageUrl });

    if (result.status === "not-found") {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (result.status !== "updated") {
      res.status(500).json({ error: "Failed to update profile image" });
      return;
    }

    res.json({ user: toUserResponse(result.user) });
  } catch (error) {
    next(error);
  }
});

router.patch("/notification-settings", async (req, res, next) => {
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

    res.json({ user: toUserResponse(result.user) });
  } catch (error) {
    next(error);
  }
});

router.get("/saved-gifts", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const savedGifts = (await listGiftRecommendations(authReq.auth.userId)).flatMap((recommendation) =>
      recommendation.items
        .filter((item) => item.saved)
        .map((item) => ({
          ...item,
          recommendationId: recommendation.id,
          createdAt: recommendation.createdAt,
        }))
    );

    res.json({ gifts: savedGifts });
  } catch (error) {
    next(error);
  }
});

router.get("/favorite-messages", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const messages = (await listMessages(authReq.auth.userId))
      .filter((message) => message.favorite)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;

    await deleteUserAppData(authReq.auth.userId);
    await deleteUser(authReq.auth.userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
