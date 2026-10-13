import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type SVGProps } from "react";

const BOT_HIGHLIGHT_PATH =
  "M9 18.25L9 19L15 19L15 18.25L9 18.25ZM1.75 11C1.75 6.99594 4.99593 3.75 9 3.75L15 3.75C19.0041 3.75 22.25 6.99594 22.25 11C22.25 15.0041 19.0041 18.25 15 18.25L15 19L15.4121 18.9893C19.5024 18.7817 22.7817 15.5024 22.9893 11.4121L23 11C23 6.71994 19.6389 3.22523 15.4121 3.01074L15 3L9 3C4.58172 3 0.999998 6.58172 0.999998 11L1.01074 11.4121C1.2183 15.5024 4.49764 18.7817 8.58789 18.9893L9 19L9 18.25C4.99594 18.25 1.75 15.0041 1.75 11Z";

const BOT_PATHS = {
  sadness: {
    body: "M20 1C20.5523 1 21 1.44772 21 2V7C21 7.48913 20.6485 7.89473 20.1846 7.98145C20.7021 8.86834 21 9.89912 21 11C21 12.2263 20.6315 13.3663 20 14.3164V19.3896C20 20.4038 18.6644 20.7738 18.1426 19.9043L16.4785 16.8154C16.0055 16.9353 15.5103 17 15 17H14.0625L15.8848 19.6504C16.5687 20.6456 15.8561 22 14.6484 22H9.35156C8.14389 22 7.43128 20.6456 8.11523 19.6504L9.9375 17H9C8.48936 17 7.99381 16.9355 7.52051 16.8154L5.85742 19.9043C5.33554 20.7738 4.00002 20.4038 4 19.3896V14.3164C3.36854 13.3663 3 12.2263 3 11C3 9.89929 3.29713 8.86824 3.81445 7.98145C3.35095 7.89436 3 7.4888 3 7V2C3 1.44772 3.44772 1 4 1C4.55228 1 5 1.44772 5 2V6.52832C6.06154 5.5781 7.46316 5 9 5H15C16.5368 5 17.9385 5.5781 19 6.52832V2C19 1.44772 19.4477 1 20 1Z",
    face: "M15 3C19.4183 3 23 6.58172 23 11C23 15.4183 19.4183 19 15 19H9C4.58172 19 1 15.4183 1 11C1 6.58172 4.58172 3 9 3H15ZM9 6C6.23858 6 4 8.23858 4 11C4 13.7614 6.23858 16 9 16H15C17.7614 16 20 13.7614 20 11C20 8.23858 17.7614 6 15 6H9ZM8.5 10.5068C9.88071 10.5068 11 9.50049 11 10.0068C10.9997 11.3873 9.88055 12.5068 8.5 12.5068C7.11945 12.5068 6.00026 11.3873 6 10.0068C6 9.50049 7.11929 10.5068 8.5 10.5068ZM15.5 10.5068C16.8807 10.5068 18 9.50049 18 10.0068C17.9997 11.3873 16.8805 12.5068 15.5 12.5068C14.1195 12.5068 13.0003 11.3873 13 10.0068C13 9.50049 14.1193 10.5068 15.5 10.5068Z",
  },
  surprise: {
    body: "M20.0001 1C20.5523 1.00012 21.0001 1.44779 21.0001 2V7C21.0001 7.48905 20.6486 7.89465 20.1847 7.98145C20.7022 8.86832 21.0001 9.89915 21.0001 11C21.0001 12.1709 20.6621 13.2621 20.0822 14.1855L23.5148 16.1426C24.3837 16.6645 24.0138 17.9996 23.0001 18H14.7501L15.8849 19.6504C16.5685 20.6455 15.8559 21.9997 14.6486 22H9.35169C8.14399 22 7.43134 20.6456 8.11536 19.6504L9.25012 18H1.00208C-0.0121464 18 -0.382261 16.6644 0.487428 16.1426L3.91712 14.1865C3.33694 13.263 3.00012 12.1711 3.00012 11C3.00012 9.89945 3.29641 8.86816 3.8136 7.98145C3.35046 7.89407 3.00012 7.48854 3.00012 7V2C3.00012 1.44772 3.44784 1 4.00012 1C4.55231 1.00012 5.00012 1.44779 5.00012 2V6.52832C6.06166 5.57813 7.46331 5 9.00012 5H15.0001C16.5369 5.00012 17.9386 5.57811 19.0001 6.52832V2C19.0001 1.44772 19.4478 1 20.0001 1Z",
    face: "M15 3C19.4183 3 23 6.58172 23 11C23 15.4183 19.4183 19 15 19H9C4.58172 19 1 15.4183 1 11C1 6.58172 4.58172 3 9 3H15ZM9 6C6.23858 6 4 8.23858 4 11C4 13.7614 6.23858 16 9 16H15C17.7614 16 20 13.7614 20 11C20 8.23858 17.7614 6 15 6H9ZM8.5 8.5C9.88071 8.5 11 9.61929 11 11C11 12.3807 9.88071 11.5 8.5 11.5C7.11929 11.5 6 12.3807 6 11C6 9.61929 7.11929 8.5 8.5 8.5ZM15.5 8.5C16.8807 8.5 18 9.61929 18 11C18 12.3807 16.8807 11.5 15.5 11.5C14.1193 11.5 13 12.3807 13 11C13 9.61929 14.1193 8.5 15.5 8.5Z",
  },
  astonishment: {
    body: "M20 1C20.5523 1 21 1.44772 21 2V7C21 7.48913 20.6485 7.89473 20.1846 7.98145C20.7021 8.86834 21 9.89912 21 11C21 14.3137 18.3137 17 15 17H14.0625L15.8848 19.6504C16.5687 20.6456 15.8561 22 14.6484 22H9.35156C8.14389 22 7.43128 20.6456 8.11523 19.6504L9.9375 17H9C5.68629 17 3 14.3137 3 11C3 9.89929 3.29713 8.86824 3.81445 7.98145C3.35095 7.89436 3 7.4888 3 7V2C3 1.44772 3.44772 1 4 1C4.55228 1 5 1.44772 5 2V6.52832C6.06154 5.5781 7.46316 5 9 5H15C16.5368 5 17.9385 5.5781 19 6.52832V2C19 1.44772 19.4477 1 20 1Z",
    face: "M15 3C19.4183 3 23 6.58172 23 11C23 15.4183 19.4183 19 15 19H9C4.58172 19 1 15.4183 1 11C1 6.58172 4.58172 3 9 3H15ZM9 6C6.23858 6 4 8.23858 4 11C4 13.7614 6.23858 16 9 16H15C17.7614 16 20 13.7614 20 11C20 8.23858 17.7614 6 15 6H9ZM8.5 8.5C9.88071 8.5 11 9.61929 11 11C11 12.3807 9.88071 13.5 8.5 13.5C7.11929 13.5 6 12.3807 6 11C6 9.61929 7.11929 8.5 8.5 8.5ZM15.5 10C16.8807 10 18 10 18 11C18 12.3807 16.8807 13.5 15.5 13.5C14.1193 13.5 13 12.3807 13 11C13 10 14.1193 10 15.5 10Z",
  },
} as const;

/** Surprise face with the left eye closed — brief wink frame. */
const SURPRISE_WINK_FACE =
  "M15 3C19.4183 3 23 6.58172 23 11C23 15.4183 19.4183 19 15 19H9C4.58172 19 1 15.4183 1 11C1 6.58172 4.58172 3 9 3H15ZM9 6C6.23858 6 4 8.23858 4 11C4 13.7614 6.23858 16 9 16H15C17.7614 16 20 13.7614 20 11C20 8.23858 17.7614 6 15 6H9ZM6.5 10.9C7.15 11.4 7.8 11.6 8.5 11.6C9.2 11.6 9.85 11.4 10.5 10.9C10.1 11.55 9.35 11.95 8.5 11.95C7.65 11.95 6.9 11.55 6.5 10.9ZM15.5 8.5C16.8807 8.5 18 9.61929 18 11C18 12.3807 16.8807 11.5 15.5 11.5C14.1193 11.5 13 12.3807 13 11C13 9.61929 14.1193 8.5 15.5 8.5Z";

export type SpawnGlassBotVariant = keyof typeof BOT_PATHS;

export type SpawnGlassBotTone = "default" | "live";

type SpawnGlassCubeIconProps = SVGProps<SVGSVGElement> & {
  /** Face expression — `sadness`, `surprise`, or `astonishment`. */
  variant?: SpawnGlassBotVariant;
  /** `live` tints the bot body shell platform blue (#4D68FF); face stays the default paper gray. */
  tone?: SpawnGlassBotTone;
  /** Loop a left-eye wink (surprise face). Honors reduced motion. */
  wink?: boolean;
};

/** Glass-style bot mark for the isometric spawn stack and first-visit hero. */
export default function SpawnGlassCubeIcon({
  className,
  variant = "sadness",
  tone = "default",
  wink = false,
  ...props
}: SpawnGlassCubeIconProps) {
  const reduceMotion = useReducedMotion();
  const winkEnabled = Boolean(wink && !reduceMotion && variant === "surprise");
  const [winking, setWinking] = useState(false);
  if (!winkEnabled && winking) {
    setWinking(false);
  }
  const { body: bodyPath, face: baseFacePath } = BOT_PATHS[variant];
  const facePath =
    winkEnabled && winking ? SURPRISE_WINK_FACE : baseFacePath;
  const isLiveTone = tone === "live";
  const uid = useId().replace(/:/g, "");
  const grad0 = `${uid}-bot-0`;
  const grad1 = `${uid}-bot-1`;
  const grad2 = `${uid}-bot-2`;
  const filter = `${uid}-bot-filter`;
  const clip = `${uid}-bot-clip`;
  const mask = `${uid}-bot-mask`;

  useEffect(() => {
    if (!winkEnabled) return;
    let openTimer = 0;
    let closeTimer = 0;
    let cancelled = false;

    const schedule = () => {
      openTimer = window.setTimeout(() => {
        if (cancelled) return;
        setWinking(true);
        closeTimer = window.setTimeout(() => {
          if (cancelled) return;
          setWinking(false);
          schedule();
        }, 160);
      }, 2400);
    };
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [winkEnabled]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={clsx("spawn-glass-cube-icon", className)}
      aria-hidden
      {...props}
    >
      <path d={bodyPath} fill={`url(#${grad0})`} mask={`url(#${mask})`} />
      <path
        d={bodyPath}
        fill={`url(#${grad0})`}
        filter={`url(#${filter})`}
        clipPath={`url(#${clip})`}
      />
      <path d={facePath} fill={`url(#${grad1})`} fillRule="evenodd" />
      <path d={BOT_HIGHLIGHT_PATH} fill={`url(#${grad2})`} />
      <defs>
        <linearGradient
          id={grad0}
          x1="12.001"
          y1="1"
          x2="12.001"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          {isLiveTone ? (
            <>
              <stop stopColor="rgba(42, 58, 168, 1)" />
              <stop offset="1" stopColor="rgba(14, 20, 58, 1)" />
            </>
          ) : (
            <>
              <stop stopColor="rgba(87, 87, 87, 1)" />
              <stop offset="1" stopColor="rgba(21, 21, 21, 1)" />
            </>
          )}
        </linearGradient>
        <linearGradient
          id={grad1}
          x1="12"
          y1="3"
          x2="12"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="rgba(227, 227, 229, 0.6)" />
          <stop offset="1" stopColor="rgba(187, 187, 192, 0.6)" />
        </linearGradient>
        <linearGradient
          id={grad2}
          x1="12"
          y1="3"
          x2="12"
          y2="12.266"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="rgba(255, 255, 255, 1)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 1)" stopOpacity="0" />
        </linearGradient>
        <filter
          id={filter}
          x="-100%"
          y="-100%"
          width="400%"
          height="400%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="2" in="SourceGraphic" result="blur" />
        </filter>
        <clipPath id={clip}>
          <path d={facePath} fill={`url(#${grad1})`} />
        </clipPath>
        <mask id={mask}>
          <rect width="100%" height="100%" fill="#FFF" />
          <path d={facePath} fill="#000" fillRule="evenodd" />
        </mask>
      </defs>
    </svg>
  );
}
