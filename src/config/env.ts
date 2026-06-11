import "dotenv/config";

export const env = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  dataDirectory: process.env.DATA_DIR ?? "data",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  naverClientId: process.env.NAVER_CLIENT_ID ?? "",
  naverClientSecret: process.env.NAVER_CLIENT_SECRET ?? "",
  tokenSecret: process.env.TOKEN_SECRET ?? "local-dev-token-secret-change-me",
};
