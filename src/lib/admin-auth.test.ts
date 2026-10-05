import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isAdminUser } from "./admin-auth";

describe("isAdminUser", () => {
  it("accepts only the admin role from app metadata", () => {
    expect(isAdminUser({ app_metadata: { role: "admin" } } as User)).toBe(true);
    expect(isAdminUser({ app_metadata: {}, user_metadata: { role: "admin" } } as User)).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});
