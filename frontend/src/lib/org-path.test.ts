import { describe, expect, it } from "vitest";
import { inferOrgSlugFromPath, stripOrgSlug, withOrgSlug } from "./org-path";

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
    expect(stripOrgSlug("/empresa-demo", inferOrgSlugFromPath("/empresa-demo"))).toBe("/");
  });

  it("infere slug no pathname", () => {
    expect(inferOrgSlugFromPath("/empresa-demo")).toBe("empresa-demo");
    expect(inferOrgSlugFromPath("/empresa-demo/financeiro/notas")).toBe("empresa-demo");
    expect(inferOrgSlugFromPath("/financeiro/notas")).toBeUndefined();
    expect(inferOrgSlugFromPath("/notas")).toBeUndefined();
    expect(inferOrgSlugFromPath("/auth/entrar")).toBeUndefined();
  });

  it("strips org slug from new product routes", () => {
    expect(stripOrgSlug("/empresa-demo/financeiro/notas", "empresa-demo")).toBe("/financeiro/notas");
    expect(stripOrgSlug("/financeiro/notas")).toBe("/financeiro/notas");
  });

  it("keeps legacy routes without org slug", () => {
    expect(stripOrgSlug("/notas")).toBe("/notas");
    expect(stripOrgSlug("/recebimentos")).toBe("/recebimentos");
  });
});
