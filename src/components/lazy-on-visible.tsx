"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type LazyOnVisibleProps = {
  /** Children mount once the wrapper enters the viewport (or rootMargin). */
  children: ReactNode;
  /** Placeholder rendered before mount (also reserves layout to avoid CLS). */
  fallback?: ReactNode;
  /** IntersectionObserver `rootMargin`. Defaults pre-load just before scroll-in. */
  rootMargin?: string;
  /** Fixed min-height for the slot so swapping in the real component does not jump. */
  minHeight?: number | string;
  /** Wrapper class. Pair with `.lazy-mount-shell` for `content-visibility: auto`. */
  className?: string;
};

/**
 * Mounts `children` only when the wrapper is about to enter the viewport.
 * Pairs with `next/dynamic({ ssr: false })` so the chunk + React work happen
 * off the critical path. Once mounted, the gate is removed (does not unmount
 * on scroll-away — pause-when-off-screen is the component's job).
 */
export default function LazyOnVisible({
  children,
  fallback = null,
  rootMargin = "240px 0px",
  minHeight,
  className,
}: LazyOnVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  const style =
    minHeight !== undefined
      ? { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }
      : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : fallback}
    </div>
  );
}
