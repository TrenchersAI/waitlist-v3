import clsx from "clsx";
import { useLayoutEffect, useRef, useState, type SVGProps } from "react";

type WideChartLayoutIconProps = SVGProps<SVGSVGElement> & {
  /** When true, filled pane is hidden / wide layout active (meaning varies by variant). */
  wide?: boolean;
  /** `scale` — terminal pane widen; `slide` — trackers sidebar pane slides off left. */
  variant?: "scale" | "slide";
};

const FRAME_PATH =
  "M20 3H4C2.346 3 1 4.346 1 6v12c0 1.654 1.346 3 3 3h16c1.654 0 3-1.346 3-3V6c0-1.654-1.346-3-3-3Z";

/** Trackers toggle — filled groups strip on the left (from design SVG). */
const TRACKERS_SIDEBAR_PATH =
  "M3 18V6c0-.551.449-1 1-1h11v14H4c-.551 0-1-.449-1-1Z";

const PANE_WIDTH = 16;
const PANE_HEIGHT = 14;
const PANE_NARROW_SCALE = 11 / 16;

const PANE_TRANSITION = "transform 300ms ease-out, opacity 300ms ease-out";

type PaneMotion = { transform: string; opacity: number };

function paneVisible(): PaneMotion {
  return { transform: "translateX(0)", opacity: 1 };
}

function paneHiddenLeft(): PaneMotion {
  return { transform: "translateX(-100%)", opacity: 0 };
}

function paneEnterFromRight(): PaneMotion {
  return { transform: "translateX(130%)", opacity: 1 };
}

function useSlidePaneMotion(wide: boolean, enabled: boolean) {
  const [motion, setMotion] = useState<PaneMotion>(() =>
    wide ? paneHiddenLeft() : paneVisible(),
  );
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const prevWide = useRef(wide);

  useLayoutEffect(() => {
    if (!enabled || prevWide.current === wide) return;
    prevWide.current = wide;

    // Defer all setState into rAF so we don't sync-update in the effect body
    // (react-hooks/set-state-in-effect). Two-phase slide still needs a paint
    // at the start pose before transitioning to the end pose.
    let raf2 = 0;
    let raf3 = 0;
    const raf1 = requestAnimationFrame(() => {
      setTransitionEnabled(true);
      if (wide) {
        setMotion(paneVisible());
        raf2 = requestAnimationFrame(() => {
          setMotion(paneHiddenLeft());
        });
        return;
      }
      setMotion(paneEnterFromRight());
      raf2 = requestAnimationFrame(() => {
        raf3 = requestAnimationFrame(() => {
          setMotion(paneVisible());
        });
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
    };
  }, [wide, enabled]);

  if (!enabled) {
    return { motion: paneVisible(), transitionEnabled: false };
  }

  return { motion, transitionEnabled };
}

/** Wide chart layout — main pane (filled) + right sidebar outline. */
export default function WideChartLayoutIcon({
  className,
  wide = false,
  variant = "scale",
  ...props
}: WideChartLayoutIconProps) {
  const isSlide = variant === "slide";
  const { motion: slideMotion, transitionEnabled } = useSlidePaneMotion(
    wide,
    isSlide,
  );

  if (isSlide) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        overflow="hidden"
        className={className}
        aria-hidden
        {...props}
      >
        <path
          d={FRAME_PATH}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path
          d={TRACKERS_SIDEBAR_PATH}
          fill="currentColor"
          className={clsx("motion-reduce:[transition:none]!")}
          style={{
            transformOrigin: "left center",
            ...slideMotion,
            transition: transitionEnabled ? PANE_TRANSITION : "none",
          }}
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d={FRAME_PATH}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <g transform="translate(4, 5)">
        <rect
          width={PANE_WIDTH}
          height={PANE_HEIGHT}
          rx={1}
          fill="currentColor"
          className={clsx("motion-reduce:[transition:none]!")}
          style={{
            transformOrigin: "left center",
            transform: wide ? "scaleX(1)" : `scaleX(${PANE_NARROW_SCALE})`,
            transition: PANE_TRANSITION,
          }}
        />
      </g>
    </svg>
  );
}
