import { describe, expect, it } from "vitest";
import { can } from "../lib/permissions";
import { hashPassword, verifyPassword } from "../lib/password";

describe("clinic roles", () => {
  it("keeps operational and clinical grants distinct", () => {
    expect(can(["RECEPTIONIST"], "finance.read")).toBe(true);
    expect(can(["RECEPTIONIST"], "clinical.read")).toBe(false);
    expect(can(["ADMIN"], "clinical.read")).toBe(false);
    expect(can(["DENTIST"], "finance.read")).toBe(false);
    expect(can(["ASSISTANT"], "dashboard.read")).toBe(true);
    expect(can(["ASSISTANT"], "patient.write")).toBe(false);
  });
  it("combines grants for multiple roles and denies an empty role set", () => {
    expect(can(["DENTIST", "ADMIN"], "clinical.read")).toBe(true);
    expect(can(["DENTIST", "ADMIN"], "finance.read")).toBe(true);
    expect(can([], "dashboard.read")).toBe(false);
  });
});

describe("passwords", () => {
  it("verifies passwords with a random salt and rejects invalid credentials", async () => {
    const password = "FictionalClinic2026!";
    const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
    expect(first).not.toBe(second);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword("incorrect", first)).resolves.toBe(false);
    await expect(verifyPassword(password)).resolves.toBe(false);
  });
});
