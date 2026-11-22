import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, clinic: string, role: string) {
  await page.getByLabel("Clinic code").fill(clinic);
  await page.getByLabel("Email").fill(`${role}@${clinic}.example`);
  await page.getByLabel("Password").fill("FictionalClinic2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("protects the dashboard and supports the desktop schedule and sign-out", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, "bright-smile", "dentist");
  await expect(page.getByRole("heading", { name: "Treatment Pipeline" })).toBeVisible();
  await expect(page.getByText("₹64,500")).toBeVisible();
  await page.getByLabel("Filter by doctor").selectOption({ label: "Dr. Ira Vardhan" });
  await expect(page.getByText("Vihaan Rao")).toHaveCount(1); // Occupied-chair card remains unfiltered.
  await page.getByLabel("Search scheduled patients").fill("Aarav");
  await expect(page.getByRole("row", { name: /Aarav Sen/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Meera Iyer/ })).toHaveCount(0);
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("opens responsive navigation and keeps reception data within the selected clinic", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await signIn(page, "cedar-smile", "reception");
  await expect(page.getByRole("row", { name: /Kiran Pinto/ })).toBeVisible();
  await expect(page.getByText("Aarav Sen")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Treatment Pipeline" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Reason / Treatment" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("navigation")).toBeHidden();
});
