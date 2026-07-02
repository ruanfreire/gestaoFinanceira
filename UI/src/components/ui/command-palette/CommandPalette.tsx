import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "../../../hooks/useFocusTrap";

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string[];
  onSelect: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
};

export function CommandPalette({
  isOpen,
  onClose,
  items,
  placeholder = "Buscar páginas e ações...",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useFocusTrap(panelRef, isOpen, onClose);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [item.label, item.description, item.group, ...(item.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, filtered, activeIndex, onClose]);

  if (!isOpen) return null;

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const g = item.group ?? "Geral";
    acc[g] = acc[g] ? [...acc[g], item] : [item];
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100001] flex items-start justify-center bg-gray-900/40 p-4 pt-[12vh] backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="border-b border-gray-100 p-3 dark:border-gray-800">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-hidden focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            aria-controls={listId}
            aria-autocomplete="list"
          />
        </div>
        <ul id={listId} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-500">Nenhum resultado</li>
          )}
          {Object.entries(groups).map(([group, groupItems]) => (
            <li key={group}>
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                {group}
              </p>
              <ul>
                {groupItems.map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                      >
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">
          ↑↓ navegar · Enter selecionar · Esc fechar
        </div>
      </div>
    </div>
  );
}
