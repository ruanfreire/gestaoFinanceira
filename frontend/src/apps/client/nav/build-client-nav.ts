import type { ModuleKey } from "@/lib/modules";
import { hasModule } from "@/lib/modules";
import { PRODUCT_PRIMARY_NAV, PRODUCT_SECTION_NAV, type ProductNavItem, type ProductNavSection } from "./product-nav.config";

export type ClientNav = {
  primary: ProductNavItem[];
  sections: ProductNavSection[];
};

function canAccess(module: ModuleKey | undefined, enabledModules: string[]) {
  return !module || hasModule(enabledModules, module);
}

/**
 * Monta o menu do cliente conforme módulos contratados.
 * O usuário vê tarefas — nunca nomes técnicos de módulo.
 */
export function buildClientNav(isOwner: boolean, enabledModules: string[]): ClientNav {
  const primary = PRODUCT_PRIMARY_NAV.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    return canAccess(item.module, enabledModules);
  });

  const sections = PRODUCT_SECTION_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(item.module, enabledModules)),
  })).filter((section) => canAccess(section.module, enabledModules) && section.items.length > 0);

  return { primary, sections };
}
