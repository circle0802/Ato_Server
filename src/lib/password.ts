import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);
const iterations = 210_000;
const keyLength = 64;
const digest = "sha512";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await pbkdf2Async(password, salt, iterations, keyLength, digest);

  return `pbkdf2:${digest}:${iterations}:${salt}:${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, storedDigest, storedIterations, salt, storedKey] = passwordHash.split(":");

  if (algorithm !== "pbkdf2" || !storedDigest || !storedIterations || !salt || !storedKey) {
    return false;
  }

  const derivedKey = await pbkdf2Async(
    password,
    salt,
    Number(storedIterations),
    Buffer.from(storedKey, "base64url").length,
    storedDigest
  );

  const storedKeyBuffer = Buffer.from(storedKey, "base64url");

  return storedKeyBuffer.length === derivedKey.length && timingSafeEqual(storedKeyBuffer, derivedKey);
}
