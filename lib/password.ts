import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, hash?: string) {
  const [salt, digest] = (hash ?? "").split(":");
  const valid = /^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(digest ?? "");
  const actual = await derive(password, valid ? salt : "0".repeat(32));
  const matches = timingSafeEqual(actual, Buffer.from(valid ? digest : "0".repeat(128), "hex"));
  return valid && matches;
}
