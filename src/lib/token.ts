import { createHmac } from "node:crypto";

import { env } from "../config/env.js";

type AuthTokenPayload = {
  sub: string;
  nickname: string;
  iat: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function createAuthToken(payload: Omit<AuthTokenPayload, "iat">) {
  const body: AuthTokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedBody = encodeBase64Url(JSON.stringify(body));
  const signature = createHmac("sha256", env.tokenSecret).update(encodedBody).digest("base64url");

  return `${encodedBody}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [encodedBody, signature] = token.split(".");

  if (!encodedBody || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", env.tokenSecret).update(encodedBody).digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8")) as AuthTokenPayload;
  } catch {
    return null;
  }
}
