import { describe, expect, it } from "vitest";
import { stripOrgSlug, withOrgSlug } from "./org-path";

describe("org-path", () => {
  it("prefixes app routes with org slug", () => {
    expect(withOrgSlug("empresa-demo", "/notas")).toBe("/empresa-demo/notas");
    expect(withOrgSlug("empresa-demo", "/")).toBe("/empresa-demo");
  });

  it("keeps public routes unchanged", () => {
    expect(withOrgSlug("empresa-demo", "/auth/entrar")).toBe("/auth/entrar");
    expect(withOrgSlug("empresa-demo", "/superadmin")).toBe("/superadmin");
  });

  it("strips org slug from pathname", () => {
    expect(stripOrgSlug("/empresa-demo/notas")).toBe("/notas");
    expect(stripOrgSlug("/empresa-demo", "empresa-demo")).toBe("/");
  });

  it("keeps legacy routes without org slug", () => {
    expect(stripOrgSlug("/notas")).toBe("/notas");
    expect(stripOrgSlug("/recebimentos")).toBe("/recebimentos");
  });
});
