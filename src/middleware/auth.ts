import type { NextFunction, Request, Response } from "express";

import { findUserById } from "../lib/userStore.js";
import { verifyAuthToken } from "../lib/token.js";

export type AuthenticatedRequest = Request & {
  auth: {
    userId: string;
    nickname: string;
  };
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as AuthenticatedRequest).auth = {
    userId: user.id,
    nickname: user.nickname,
  };

  next();
}
