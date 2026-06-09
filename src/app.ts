import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";

import aiRouter from "./routes/ai.js";
import authRouter from "./routes/auth.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);

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
