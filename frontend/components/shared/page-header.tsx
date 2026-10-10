import { DemoBadge } from "@/components/layout/demo-badge";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        <DemoBadge className="sm:hidden" />
      </div>
      {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
