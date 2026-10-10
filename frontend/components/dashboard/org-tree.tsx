"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { StatusIcon } from "@/components/shared/status-chip";
import type { Locale } from "@/i18n/config";
import type { OrgNode } from "@/lib/api";
import { fmtNumber, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { TypeIcon } from "./type-icon";

/** DJS -> OPOW / ODEJ -> facilities. Office nodes expand/collapse and filter the
 *  facilities table; facility leaves drill down to the facility page. */
export function OrgTree({
  selectedPath,
  onSelectOffice,
  className,
}: {
  selectedPath: string | null;
  onSelectOffice: (path: string | null) => void;
  className?: string;
}) {
  const t = useTranslations("tree");
  const { data, error, isLoading, mutate } = useApi<OrgNode>("/org/tree");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <LoadingBlock className="h-72" />
        ) : (
          <ul role="tree" className="text-sm">
            <TreeNode node={data} depth={0} selectedPath={selectedPath} onSelectOffice={onSelectOffice} />
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelectOffice,
}: {
  node: OrgNode;
  depth: number;
  selectedPath: string | null;
  onSelectOffice: (path: string | null) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const hasChildren = node.children.length > 0;
  // Root and offices start expanded so the whole structure is visible at a glance.
  const [open, setOpen] = useState(depth < 2);

  const name = pick(node, "name", locale);
  const meta = (
    <span className="ms-auto shrink-0 text-xs tabular-nums text-muted-foreground">
      {t("tree.members", { n: fmtNumber(node.members, locale) })}
    </span>
  );

  if (node.facility_id) {
    return (
      <li role="treeitem" aria-selected={false}>
        <Link
          href={`/facilities/${node.facility_id}`}
          className="flex items-center gap-2 rounded-md py-1.5 pe-2 transition-colors hover:bg-muted"
          style={{ paddingInlineStart: depth * 16 + 24 }}
        >
          <TypeIcon type={node.type} className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">{name}</span>
          {node.status && <StatusIcon status={node.status} />}
          {meta}
        </Link>
      </li>
    );
  }

  const selected = selectedPath === node.path;
  return (
    <li role="treeitem" aria-expanded={open} aria-selected={selected}>
      <div
        className={cn("flex items-center gap-1 rounded-md transition-colors hover:bg-muted", selected && "bg-primary/10")}
        style={{ paddingInlineStart: depth * 16 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={open ? t("tree.collapse") : t("tree.expand")}
          disabled={!hasChildren}
        >
          <ChevronRight className={cn("size-4 transition-transform rtl:-scale-x-100", open && "rotate-90 rtl:-rotate-90")} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            // Clicking the root clears the filter; clicking an office toggles it.
            onSelectOffice(depth === 0 || selected ? null : node.path);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pe-2 text-start"
        >
          <TypeIcon type={node.type} className="size-4 shrink-0 text-primary" />
          <span className={cn("min-w-0 truncate", depth < 2 && "font-medium")}>{name}</span>
          {meta}
        </button>
      </div>
      {hasChildren && open && (
        <ul role="group">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} selectedPath={selectedPath} onSelectOffice={onSelectOffice} />
          ))}
        </ul>
      )}
    </li>
  );
}
