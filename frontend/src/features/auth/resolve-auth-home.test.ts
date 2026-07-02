import { describe, expect, it } from "vitest";
import { resolveAuthHomePath } from "./resolve-auth-home";
import type { AuthUser } from "./types";

describe("resolveAuthHomePath", () => {
  it("envia superadmin para o painel", () => {
    const user = { _id: "1", name: "SA", email: "sa@x.com", roles: ["superadmin"] } satisfies AuthUser;
    expect(resolveAuthHomePath(user)).toBe("/superadmin");
  });

  it("envia cliente para a home da organização", () => {
    const user = {
      _id: "1",
      name: "Admin",
      email: "admin@x.com",
      organization: { _id: "o1", name: "Demo", slug: "empresa-demo" },
    } satisfies AuthUser;
    expect(resolveAuthHomePath(user)).toBe("/empresa-demo");
  });

  it("não redireciona para / sem slug", () => {
    const user = { _id: "1", name: "Admin", email: "admin@x.com", roles: ["admin"] } satisfies AuthUser;
    expect(resolveAuthHomePath(user)).toBeNull();
    expect(resolveAuthHomePath(user, "/")).toBeNull();
  });

  it("não usa fallback sem slug da organização", () => {
    const user = { _id: "1", name: "Admin", email: "admin@x.com", roles: ["admin"] } satisfies AuthUser;
    expect(resolveAuthHomePath(user, "/empresa-demo/notas")).toBeNull();
  });

  it("usa fallback dentro da mesma organização", () => {
    const user = {
      _id: "1",
      name: "Admin",
      email: "admin@x.com",
      organization: { _id: "o1", name: "Demo", slug: "empresa-demo" },
    } satisfies AuthUser;
    expect(resolveAuthHomePath(user, "/empresa-demo/notas")).toBe("/empresa-demo/notas");
  });
});
