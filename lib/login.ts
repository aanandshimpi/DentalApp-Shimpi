import { z } from "zod";
import { db } from "./db";
import { verifyPassword } from "./password";
import { tokenHash } from "./session";

const credentials = z.object({
  clinic: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,64}$/),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});

export async function authenticate(input: unknown) {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return null;
  const { clinic, email, password } = parsed.data;
  const key = tokenHash(`${clinic}:${email}`);
  // Reserve the attempt atomically before running the password KDF.
  const [limit] = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, now() + interval '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."expiresAt" <= now() THEN 1
        ELSE LEAST("LoginThrottle"."attempts" + 1, 9) END,
      "expiresAt" = CASE WHEN "LoginThrottle"."expiresAt" <= now()
        THEN now() + interval '15 minutes' ELSE "LoginThrottle"."expiresAt" END
    RETURNING "attempts"
  `;
  if (limit.attempts > 8) return null;

  const user = await db.user.findFirst({
    where: { clinic: { slug: clinic }, email, active: true },
    select: { id: true, clinicId: true, passwordHash: true, roles: { take: 1 } },
  });
  if (!(await verifyPassword(password, user?.passwordHash)) || !user?.roles.length) return null;
  await db.loginThrottle.deleteMany({ where: { key } });
  return { id: user.id, clinicId: user.clinicId };
}
