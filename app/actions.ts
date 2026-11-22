"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/login";
import { cookieName, createSession, revokeSession } from "@/lib/session";

export async function signIn(_state: string, form: FormData) {
  const user = await authenticate({
    clinic: form.get("clinic"), email: form.get("email"), password: form.get("password"),
  });
  if (!user) return "Sign-in failed. Check your clinic and credentials or try again in 15 minutes.";
  const jar = await cookies();
  await revokeSession(jar.get(cookieName)?.value);
  const { token, expiresAt } = await createSession(user.clinicId, user.id);
  jar.set(cookieName, token, {
    httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt,
    secure: process.env.NODE_ENV === "production" && process.env.LOCAL_HTTP_PREVIEW !== "1",
  });
  redirect("/dashboard");
}

export async function signOut() {
  const jar = await cookies();
  await revokeSession(jar.get(cookieName)?.value);
  jar.delete(cookieName);
  redirect("/login");
}
