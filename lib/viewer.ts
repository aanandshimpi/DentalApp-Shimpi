import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieName, readSession } from "./session";

export async function getViewer() {
  return readSession((await cookies()).get(cookieName)?.value);
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
