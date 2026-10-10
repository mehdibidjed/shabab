import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-foreground",
  info: "bg-series-1/10 text-foreground",
  good: "bg-status-good/10 text-foreground",
  warn: "bg-status-warning/15 text-foreground",
  bad: "bg-status-critical/10 text-foreground",
};

/** Small status label. Colour is a hint only; the text always carries the meaning. */
export function Pill({ tone = "neutral", icon: Icon, children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}
