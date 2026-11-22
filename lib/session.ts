import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const cookieName = "dentalcare_session";
export const sessionDuration = 8 * 60 * 60 * 1000;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const isSessionToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

export async function createSession(clinicId: string, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDuration);
  await db.$transaction([
    db.session.create({ data: { tokenHash: tokenHash(token), clinicId, userId, expiresAt } }),
    db.auditLog.create({ data: { clinicId, actorId: userId, action: "SIGN_IN" } }),
  ]);
  return { token, expiresAt };
}

export async function readSession(token: string | undefined) {
  if (!token || !isSessionToken(token)) return null;
  const session = await db.session.findFirst({
    where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() }, user: { active: true } },
    select: {
      user: {
        select: {
          id: true, name: true,
          clinic: { select: { id: true, name: true, timezone: true, currency: true } },
          roles: { select: { role: true }, orderBy: { role: "asc" } },
        },
      },
    },
  });
  if (!session) return null;
  const { roles, ...user } = session.user;
  return { ...user, roles: roles.map(({ role }) => role) };
}

export type Viewer = NonNullable<Awaited<ReturnType<typeof readSession>>>;

export async function revokeSession(token: string | undefined) {
  if (!token || !isSessionToken(token)) return;
  await db.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { tokenHash: tokenHash(token) }, select: { clinicId: true, userId: true },
    });
    if (!session) return;
    const { count } = await tx.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
    if (count) await tx.auditLog.create({
      data: { clinicId: session.clinicId, actorId: session.userId, action: "SIGN_OUT" },
    });
  });
}
