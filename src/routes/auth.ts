import { Router } from "express";
import { z } from "zod";

import { createAuthToken } from "../lib/token.js";
import { createUser, findUserByNickname, isNicknameTaken } from "../lib/userStore.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const router = Router();

const nicknameSchema = z
  .string()
  .trim()
  .min(2, "Nickname must be at least 2 characters")
  .max(20, "Nickname must be at most 20 characters")
  .regex(/^[가-힣a-zA-Z0-9_]+$/, "Nickname can only contain Korean, English, numbers, and underscore");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/^\S+$/, "Password cannot contain spaces");

const signupSchema = z.object({
  nickname: nicknameSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  nickname: nicknameSchema,
  password: z.string().min(1),
});

router.get("/nickname-check", async (req, res, next) => {
  try {
    const nickname = nicknameSchema.parse(req.query.nickname);
    const taken = await isNicknameTaken(nickname);

    res.json({
      nickname,
      available: !taken,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const { nickname, password } = signupSchema.parse(req.body);
    const passwordHash = await hashPassword(password);
    const user = await createUser({ nickname, passwordHash });

    if (!user) {
      res.status(409).json({
        error: "Nickname is already taken",
      });
      return;
    }

    const token = createAuthToken({
      sub: user.id,
      nickname: user.nickname,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { nickname, password } = loginSchema.parse(req.body);
    const user = await findUserByNickname(nickname);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({
        error: "Invalid nickname or password",
      });
      return;
    }

    const token = createAuthToken({
      sub: user.id,
      nickname: user.nickname,
    });

    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
