"use client";

import * as React from "react";

import { cn } from "@/src/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (next: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return ctx;
}

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

function Tabs({ value, onValueChange, className, children }: TabsProps) {
  const setValue = React.useCallback(
    (next: string) => {
      onValueChange(next);
    },
    [onValueChange],
  );

  const store = React.useMemo(
    () => ({ value, setValue }),
    [value, setValue],
  );

  return (
    <TabsContext.Provider value={store}>
      <div data-slot="tabs" className={cn("flex flex-col gap-4", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 text-zinc-400",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ComponentProps<"button"> & {
  value: string;
};

function TabsTrigger({
  className,
  value,
  ...props
}: TabsTriggerProps) {
  const { value: active, setValue } = useTabsContext("TabsTrigger");
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        selected
          ? "bg-zinc-800 text-white shadow-sm"
          : "text-zinc-400 hover:text-zinc-200",
        className,
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  );
}

type TabsContentProps = React.ComponentProps<"div"> & {
  value: string;
};

function TabsContent({
  className,
  value,
  ...props
}: TabsContentProps) {
  const { value: active } = useTabsContext("TabsContent");
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      className={cn("flex flex-col gap-4 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
