"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

const STROKE_PATH =
  "M1 118.5s82.308-15.501 113.735-29 74.769-1.713 121.217-12c37.596-8.328 58.517-15.006 93.781-30.5 80.146-35.215 123.213-16 154.141-24.5S635.97.849 644 1.5";

const FILL_PATH =
  "M113.912 89.012C82.437 102.511 1 118.01 1 118.01V188h643V1.023c-8.043-.65-129.399 12.499-160.375 20.998-30.976 8.498-74.11-10.714-154.38 24.496-35.319 15.493-56.272 22.17-93.927 30.497-46.52 10.286-89.93-1.5-121.406 11.998";

export default function Graph() {
  const reduceMotion = useReducedMotion();
  const gradId = React.useId().replace(/:/g, "");

  const strokeDrawDuration = reduceMotion ? 0 : 1.35;
  const fillFadeDelay = reduceMotion ? 0 : 0.35;
  const fillFadeDuration = reduceMotion ? 0 : 0.75;

  return (
    <div className="w-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 644 188"
        className="block h-auto w-full"
      >
        <motion.path
          fill="none"
          stroke="#0090FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d={STROKE_PATH}
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            pathLength: {
              duration: strokeDrawDuration,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
        />
        <motion.path
          fill={`url(#paint0_linear_graph_${gradId})`}
          d={FILL_PATH}
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: fillFadeDelay,
            duration: fillFadeDuration,
            ease: "easeOut",
          }}
        />
        <defs>
          <linearGradient
            id={`paint0_linear_graph_${gradId}`}
            x1="322.5"
            x2="322.5"
            y1="1"
            y2="188"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#138EED" stopOpacity="0.4" />
            <stop offset="1" stopColor="#058FFB" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
