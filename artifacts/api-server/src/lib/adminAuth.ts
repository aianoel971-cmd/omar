import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "local-dev-admin-secret";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64url");

function sign(header: string, body: string): string {
  return createHmac("sha256", SESSION_SECRET).update(`${header}.${body}`).digest("base64url");
}

export function createSessionToken(username: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ sub: "admin", username, iat: now, exp: now + SESSION_TTL_SECONDS }),
  );
  return `${header}.${body}.${sign(header, body)}`;
}

export function verifySessionToken(token: string): { username: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");

  const [header, body, signature] = parts;
  if (signature !== sign(header, body)) throw new Error("Bad signature");

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    sub?: unknown;
    username?: unknown;
    exp?: unknown;
  };
  if (payload.sub !== "admin" || typeof payload.username !== "string") {
    throw new Error("Invalid subject");
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return { username: payload.username };
}