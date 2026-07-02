import { describe, expect, it } from "vitest";
import { loginSchema } from "./schema";

describe("loginSchema", () => {
  it("aceita credenciais válidas", () => {
    const result = loginSchema.safeParse({
      email: "admin@finance.local",
      password: "123456",
      remember: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail vazio", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "123456",
      remember: false,
    });
    expect(result.success).toBe(false);
  });
});
