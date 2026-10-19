import { DemoBadge } from "@/components/layout/demo-badge";

export function PageHeader({ title, subtitle, children, actions }) {
  return (
    <header className="flex flex-col gap-2 pb-1">
      {children}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
            <DemoBadge className="sm:hidden" />
          </div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {actions}
      </div>
    </header>
  );
}
