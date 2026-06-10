import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";

import aiRouter from "./routes/ai.js";
import anniversaryRouter from "./routes/anniversaries.js";
import authRouter from "./routes/auth.js";
import docsRouter from "./routes/docs.js";
import giftRouter from "./routes/gifts.js";
import meRouter from "./routes/me.js";
import messageRouter from "./routes/messages.js";
import notificationRouter from "./routes/notifications.js";
import { requireAuth } from "./middleware/auth.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(docsRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);
app.use("/api/anniversaries", requireAuth, anniversaryRouter);
app.use("/api/gifts", requireAuth, giftRouter);
app.use("/api/messages", requireAuth, messageRouter);
app.use("/api/notifications", requireAuth, notificationRouter);
app.use("/api/me", requireAuth, meRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request",
      details: err.issues,
    });
    return;
  }

  if (err instanceof Error && err.message === "ANTHROPIC_API_KEY is not set") {
    res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY",
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "Internal server error",
  });
});
