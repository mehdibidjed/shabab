"use client";

import { cn } from "@/lib/utils";

/** Segmented control: `tabs` = [{ key, label, icon? }]. Scrolls horizontally on phones. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div role="tablist" className="inline-flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={value === key}
            onClick={() => onChange(key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
              value === key
                ? "bg-card font-medium text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
