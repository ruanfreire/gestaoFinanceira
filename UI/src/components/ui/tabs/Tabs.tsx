import { ReactNode, createContext, useContext, useId } from "react";

type TabsContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ value, onChange, children, className = "" }: TabsProps) {
  const baseId = useId().replace(/:/g, "");

  return (
    <TabsContext.Provider value={{ activeTab: value, setActiveTab: onChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabListProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function TabList({ children, className = "", "aria-label": ariaLabel }: TabListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}

type TabProps = {
  id: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function Tab({ id, children, className = "", disabled = false }: TabProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === id;
  const tabId = `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(id)}
      className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
        isActive
          ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

type TabPanelProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export function TabPanel({ id, children, className = "" }: TabPanelProps) {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === id;
  const tabId = `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={`pt-4 focus:outline-hidden ${className}`}
    >
      {children}
    </div>
  );
}
