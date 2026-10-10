"use client";

import { cn } from "@/lib/utils";

/** Minimal accessible tabs: `tabs` = [{ key, label, icon? }]. Scrolls horizontally on phones. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
            value === key
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {Icon && <Icon className="size-4" aria-hidden />}
          {label}
        </button>
      ))}
    </div>
  );
}
