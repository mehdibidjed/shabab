"use client";

import { useEffect, useRef, useState } from "react";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts from the previous value to `value` (ease-out), then formats with `format`.
 *  Jumps straight to the value when the user prefers reduced motion. */
export function AnimatedNumber({ value, format = String, duration = 900 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    const total = reduceMotion() ? 0 : duration;
    let frame = requestAnimationFrame(function tick(now) {
      const p = total ? Math.min(1, (now - t0) / total) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular-nums">{format(Number.isInteger(value) ? Math.round(shown) : shown)}</span>;
}
