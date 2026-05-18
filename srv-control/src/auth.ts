import crypto from "node:crypto";

/**
 * HMAC-SHA256 подпись (base64url) для запросов между Vercel и srv-control.
 * Подписываем строку <method>\n<path>\n<body-sha256>.
 */

export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function hmacVerify(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = hmacSign(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function bodyHash(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}
