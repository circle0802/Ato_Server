import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, env.host, () => {
  console.log(`Ato server is running on http://${env.host}:${env.port}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
