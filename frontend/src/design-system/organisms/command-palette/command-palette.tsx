import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Modal } from "../modal/modal";
import { Input, Typography } from "@/design-system/atoms";
import { COMMAND_ROUTES } from "@/lib/command-routes";
import { openPushPermissionPrompt } from "@/lib/push-prompt-events";
import { cn } from "@/design-system/lib/cn";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { useOrgPath } from "@/features/org/org-slug-context";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);
  const { user } = useAuth();
  const orgPath = useOrgPath();

  const availableRoutes = useMemo(
    () => COMMAND_ROUTES.filter((item) => !item.ownerOnly || isTenantOwner(user)),
    [user],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableRoutes;
    return availableRoutes.filter(
      (item) => item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
    );
  }, [availableRoutes, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (item: (typeof results)[number]) => {
    onOpenChange(false);
    if (item.action === "enable-push") {
      openPushPermissionPrompt();
      return;
    }
    if (item.to) navigate(orgPath(item.to));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ir para" description="Busque uma tela ou use as setas">
      <div className="stack-gap">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar telas…"
            className="pl-9"
            aria-label="Buscar telas"
            aria-controls="command-palette-list"
            aria-activedescendant={results[activeIndex] ? `command-item-${results[activeIndex].id}` : undefined}
          />
        </div>
        <Typography variant="caption" tone="muted">
          <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">K</kbd> para abrir
        </Typography>
        <ul id="command-palette-list" ref={listRef} className="max-h-64 overflow-y-auto rounded-lg border border-border" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center">
              <Typography variant="small" tone="muted">
                Nenhuma tela encontrada
              </Typography>
            </li>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const active = index === activeIndex;
              return (
                <li key={item.id} id={`command-item-${item.id}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-body transition-default",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(item)}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Modal>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}
