"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Compact select for table filters. `items` is an ordered [value, label][] list. */
export function FilterSelect({ value, onChange, items, label, className }) {
  return (
    <Select items={Object.fromEntries(items)} value={value} onValueChange={(v) => onChange(String(v ?? "all"))}>
      <SelectTrigger size="sm" className={cn("w-full sm:w-44", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
