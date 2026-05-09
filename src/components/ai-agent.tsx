"use client";

import React from "react";
import { AnimatePresence, motion } from "motion/react";

export default function AIAgent() {
  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center pl-12">
      <Logo className="absolute top-20 z-10" />
      <BackgroundLines className="absolute top-20" />
      <MorphSurface />
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`relative size-16 border border-dashed border-neutral-600 rounded-full ${className}`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 bg-[linear-gradient(90deg,#FF8989_0%,#2B7FFF_100%)] opacity-50 blur-[6px] rounded-xl -z-10"></div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="81"
        viewBox="0 0 80 81"
        fill="none"
        className="z-10 absolute top-[78%] left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <foreignObject x="0" y="-7" width="79.5996" height="87.5996">
          <div
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              clipPath: "url(#bgblur_0_3016_337_clip_path)",
              height: "100%",
              width: "100%",
            }}
          />
        </foreignObject>
        <g filter="url(#filter0_ddd_3016_337)" data-figma-bg-blur-radius="8">
          <rect
            x="20"
            y="1"
            width="39.6"
            height="39.6"
            rx="19.8"
            fill="url(#paint0_radial_3016_337)"
            shapeRendering="crispEdges"
          />
          <path
            d="M36.4746 17.7734C38.56 15.688 39.5996 10.8984 39.5996 10.8984V20.8984H29.5996C29.5996 20.8984 34.3892 19.8588 36.4746 17.7734Z"
            fill="black"
          />
          <path
            d="M39.5996 20.8984H49.5996C49.5996 20.8984 44.81 21.938 42.7246 24.0234C40.6392 26.1088 39.5996 30.8984 39.5996 30.8984V20.8984Z"
            fill="black"
          />
        </g>
        <defs>
          <filter
            id="filter0_ddd_3016_337"
            x="0"
            y="-7"
            width="79.5996"
            height="87.5996"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feMorphology
              radius="6"
              operator="erode"
              in="SourceAlpha"
              result="effect1_dropShadow_3016_337"
            />
            <feOffset dy="8" />
            <feGaussianBlur stdDeviation="5" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.065 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_3016_337"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feMorphology
              radius="5"
              operator="erode"
              in="SourceAlpha"
              result="effect2_dropShadow_3016_337"
            />
            <feOffset dy="20" />
            <feGaussianBlur stdDeviation="12.5" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.065 0"
            />
            <feBlend
              mode="normal"
              in2="effect1_dropShadow_3016_337"
              result="effect2_dropShadow_3016_337"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feMorphology
              radius="1"
              operator="dilate"
              in="SourceAlpha"
              result="effect3_dropShadow_3016_337"
            />
            <feOffset />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.075 0"
            />
            <feBlend
              mode="normal"
              in2="effect2_dropShadow_3016_337"
              result="effect3_dropShadow_3016_337"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect3_dropShadow_3016_337"
              result="shape"
            />
          </filter>
          <clipPath id="bgblur_0_3016_337_clip_path" transform="translate(0 7)">
            <rect x="20" y="1" width="39.6" height="39.6" rx="19.8" />
          </clipPath>
          <radialGradient
            id="paint0_radial_3016_337"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(39.8 20.8) scale(28.0014)"
          >
            <stop offset="0.35" stopColor="#d4d4d8" />
            <stop offset="1" stopColor="#52525b" stopOpacity="0.7" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

function BackgroundLines(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="395"
      height="182"
      viewBox="0 0 395 182"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 57.3477 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 301.549 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 1 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 5 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 9 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 13 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 17 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 21 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 25 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 29 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 33 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 37 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 41 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 45 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 49 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 53 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 61 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 65 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 69 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 73 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 77 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 81 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 85 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 89 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 93 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 97 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 101 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 105 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 109 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 113 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 117 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 121 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 125 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 129 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 133 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 137 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 141 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 145 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 149 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 153 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 157 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 161 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 165 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 169 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 173 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 177 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 181 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 185 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 189 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 193 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 197 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 201 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 205 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 209 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 213 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 217 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 221 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 225 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 229 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 233 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 237 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 241 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 245 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 249 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 253 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 257 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 261 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 265 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 269 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 273 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 277 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 281 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 285 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 289 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 293 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 297 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 305 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 309 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 313 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 317 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 321 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 325 180.998)"
        stroke="#5D6FAE"
      />
      <line
        y1="-0.5"
        x2="191.631"
        y2="-0.5"
        transform="matrix(0.343078 -0.939307 0.343078 0.939307 329 180.998)"
        stroke="#5D6FAE"
      />
      <rect width="394" height="182" fill="url(#paint0_radial_3027_161)" />
      <defs>
        <radialGradient
          id="paint0_radial_3027_161"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(197 91) scale(208.82 163.8)"
        >
          <stop stopColor="#030305" stopOpacity="0" />
          <stop offset="0.635007" stopColor="#141418" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const SPEED = 1.4;

interface FooterContext {
  showFeedback: boolean;
  success: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
}

const FooterContext = React.createContext({} as FooterContext);
const useFooter = () => React.useContext(FooterContext);

export function MorphSurface() {
  const rootRef = React.useRef<HTMLDivElement>(null);

  const feedbackRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [showFeedback, setShowFeedback, mouse] = useLoop();
  const [success, setSuccess] = React.useState(false);

  function closeFeedback() {
    setShowFeedback(false);
    feedbackRef.current?.blur();
  }

  function openFeedback() {
    setShowFeedback(true);
    setTimeout(() => {
      feedbackRef.current?.focus();
    });
  }

  function onFeedbackSuccess() {
    closeFeedback();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  }

  const context = React.useMemo(
    () => ({
      showFeedback,
      success,
      openFeedback,
      closeFeedback,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showFeedback, success],
  );

  return (
    <div
      // TODO move out
      className="flex items-end justify-center z-20"
      style={{
        width: FEEDBACK_WIDTH,
        height: FEEDBACK_HEIGHT,
      }}
      {...mouse}
    >
      <motion.div
        data-footer
        ref={rootRef}
        className={
          "bg-[#0F1010] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_15px_-3px_rgba(0,0,0,0.45),0_4px_6px_-4px_rgba(0,0,0,0.35)] relative flex flex-col items-center bottom-8 max-sm:bottom-5 z-3 shadow-menu overflow-hidden"
        }
        initial={false}
        animate={{
          width: showFeedback ? FEEDBACK_WIDTH : "auto",
          height: showFeedback ? FEEDBACK_HEIGHT : 44,
          borderRadius: showFeedback ? 14 : 20,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED,
          damping: 45,
          mass: 0.7,
          delay: showFeedback ? 0 : 0.08,
        }}
      >
        <FooterContext value={context}>
          <Dock />
          <Feedback ref={feedbackRef} onSuccess={onFeedbackSuccess} />
        </FooterContext>
      </motion.div>
    </div>
  );
}

///////////////////////////////////////////////////////////////////////////////////////

function Dock() {
  const { success, showFeedback, openFeedback } = useFooter();
  return (
    <footer className="flex items-center justify-center select-none whitespace-nowrap mt-auto h-11">
      <div className="flex items-center justify-center gap-6 px-3 max-sm:h-10 max-sm:px-2">
        <div className="flex items-center gap-2 w-fit">
          {showFeedback ? (
            <div className="w-5 h-5" style={{ opacity: 0 }} />
          ) : (
            <motion.div
              className="w-3 h-3 bg-[#455EFF] rounded-full"
              layoutId="morph-surface-dot"
              transition={LOGO_SPRING}
            >
              <AnimatePresence>
                {success && (
                  <motion.div
                    key="check"
                    exit={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      type: "spring",
                      stiffness: 500 / SPEED,
                      damping: 22,
                      delay: success ? 0.3 : 0,
                    }}
                    className="m-0.5"
                  >
                    <IconCheck />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          <div className="text-xs text-neutral-300">AI Agent</div>
        </div>

        <button
          className="button -m-2 flex justify-end rounded-full p-2 flex-1 gap-1 -outline-offset-2"
          data-variant="ghost"
          onClick={openFeedback}
        >
          <span className="ml-1 max-w-[20ch] truncate text-xs text-neutral-300">
            AI Agent
          </span>
        </button>
      </div>
    </footer>
  );
}

///////////////////////////////////////////////////////////////////////////////////////

const FEEDBACK_WIDTH = 360;
const FEEDBACK_HEIGHT = 200;

function Feedback({
  ref,
  onSuccess,
}: {
  ref: React.Ref<HTMLTextAreaElement>;
  onSuccess: () => void;
}) {
  const { closeFeedback, showFeedback } = useFooter();
  const submitRef = React.useRef<HTMLButtonElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSuccess();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      closeFeedback();
    }
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      submitRef.current?.click();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="absolute bottom-0"
      style={{
        width: FEEDBACK_WIDTH,
        height: FEEDBACK_HEIGHT,
        pointerEvents: showFeedback ? "all" : "none",
      }}
    >
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 550 / SPEED,
              damping: 45,
              mass: 0.7,
            }}
            className="p-5 bg-[#0B0C0D] flex flex-col h-full shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_15px_-3px_rgba(0,0,0,0.5),0_4px_6px_-4px_rgba(0,0,0,0.4)]"
          >
            <div className="flex gap-2 items-center justify-center w-full">
              <IconContainer>
                <SearchIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Understand Query
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Identify intent and key terms
                  </span>
                </div>
                <div className="size-5 rounded-full bg-emerald-950/90 ring-1 ring-emerald-500/35 flex items-center justify-center">
                  <TickIcon />
                </div>
              </div>
            </div>

            <div className="w-px border h-full ml-5 border-dashed border-neutral-700"></div>

            <div className="flex gap-2 items-center justify-center w-full">
              <IconContainer>
                <DatabaseIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Context Retrieval
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Retrieving relevant information
                  </span>
                </div>
                <div className="size-5 rounded-full bg-blue-950/90 ring-1 ring-[#455EFF]/40 flex items-center justify-center">
                  <LoaderIcon className="animate-spin [animation-duration:1.2s]" />
                </div>
              </div>
            </div>

            <div className="w-px border h-full ml-5 border-dashed border-neutral-200"></div>

            <div className="flex gap-2 items-center justify-center w-full opacity-55 ">
              <IconContainer>
                <FlashIcon />
              </IconContainer>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-1 justify-center flex-col">
                  <span className="text-xs text-neutral-100">
                    Build Context
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Combine results for execution
                  </span>
                </div>
                <div className="px-1 py-0.5 text-[10px] rounded-full text-neutral-400 bg-neutral-800 flex items-center justify-center">
                  Pending
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
///////////////////////////////////////////////////////////////////////////////////////

const LOGO_SPRING = {
  type: "spring",
  stiffness: 350 / SPEED,
  damping: 35,
} as const;

function useLoop(): [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
  {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  },
] {
  const [show, setShow] = React.useState(false);
  const id = React.useRef<number | null>(null);

  function loop() {
    id.current = window.setInterval(() => {
      setShow((prev) => !prev);
    }, 1500);
  }

  React.useEffect(() => {
    loop();
    return () => {
      if (id.current) {
        window.clearInterval(id.current);
      }
    };
  }, []);

  function onMouseEnter() {
    if (id.current) {
      window.clearInterval(id.current);
    }
  }

  function onMouseLeave() {
    loop();
  }

  return [
    show,
    setShow,
    {
      onMouseEnter,
      onMouseLeave,
    },
  ];
}

function IconCheck() {
  return (
    <svg
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      color="white"
    >
      <path
        d="M5 13L9 17L19 7"
        stroke="white"
        strokeWidth="2px"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M1.99975 6.99935C1.90513 6.99967 1.81237 6.97314 1.73223 6.92284C1.65209 6.87254 1.58787 6.80053 1.54703 6.71518C1.50618 6.62983 1.4904 6.53464 1.5015 6.44068C1.5126 6.34671 1.55014 6.25783 1.60975 6.18435L6.55975 1.08435C6.59688 1.04149 6.64748 1.01253 6.70324 1.00222C6.759 0.991904 6.81661 1.00086 6.86662 1.0276C6.91662 1.05435 6.95604 1.0973 6.97842 1.1494C7.00079 1.20151 7.00479 1.25967 6.98975 1.31435L6.02975 4.32435C6.00144 4.40011 5.99194 4.48161 6.00205 4.56185C6.01216 4.6421 6.04158 4.71869 6.0878 4.78506C6.13401 4.85144 6.19564 4.90561 6.26739 4.94293C6.33914 4.98025 6.41887 4.99961 6.49975 4.99935H9.99975C10.0944 4.99903 10.1871 5.02556 10.2673 5.07586C10.3474 5.12616 10.4116 5.19817 10.4525 5.28352C10.4933 5.36887 10.5091 5.46406 10.498 5.55802C10.4869 5.65198 10.4494 5.74087 10.3898 5.81435L5.43975 10.9143C5.40262 10.9572 5.35202 10.9862 5.29626 10.9965C5.2405 11.0068 5.18289 10.9978 5.13289 10.9711C5.08288 10.9444 5.04346 10.9014 5.02108 10.8493C4.99871 10.7972 4.99471 10.739 5.00975 10.6844L5.96975 7.67435C5.99806 7.59859 6.00757 7.51709 5.99746 7.43685C5.98735 7.3566 5.95792 7.28001 5.91171 7.21364C5.86549 7.14726 5.80387 7.09309 5.73211 7.05577C5.66036 7.01845 5.58063 6.99909 5.49975 6.99935H1.99975Z"
        stroke="#a3a3a3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      {...props}
    >
      <path
        d="M5.05078 1.09108C5.67829 0.96964 6.32327 0.96964 6.95078 1.09108"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.95078 10.9092C6.32327 11.0306 5.67829 11.0306 5.05078 10.9092"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.80469 1.86035C9.33542 2.21996 9.79205 2.67829 10.1497 3.21035"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.09108 6.9498C0.96964 6.32229 0.96964 5.67732 1.09108 5.0498"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.1391 8.80469C9.77945 9.33542 9.32113 9.79205 8.78906 10.1497"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.9082 5.0498C11.0296 5.67732 11.0296 6.32229 10.9082 6.9498"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.86133 3.19559C2.22094 2.66485 2.67926 2.20823 3.21133 1.85059"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.19461 10.1391C2.66387 9.77945 2.20725 9.32113 1.84961 8.78906"
        stroke="#155DFC"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="#009966"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-9 rounded-lg bg-[linear-gradient(180deg,#1c1c1f_0%,#0f0f12_100%)] flex items-center justify-center shadow-[0_0_0_3px_rgba(255,255,255,0.04)_inset,0_0_0_1px_rgba(255,255,255,0.08),0_4px_6px_-1px_rgba(0,0,0,0.45),0_2px_4px_-2px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
    >
      <line
        x1="20.5"
        y1="20.5"
        x2="15"
        y2="15"
        fill="none"
        stroke="#d4d4d8"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-color="color-2"
      ></line>
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="#d4d4d8"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
      ></circle>
    </svg>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="m3,5v14c0,1.7,4,3,9,3s9-1.3,9-3V5"
        fill="none"
        stroke="#6B7FFF"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-cap="butt"
      ></path>
      <ellipse
        cx="12"
        cy="5"
        rx="9"
        ry="3"
        fill="none"
        stroke="#6B7FFF"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
        data-color="color-2"
      ></ellipse>
      <path
        d="m21,12c0,1.7-4,3-9,3s-9-1.3-9-3"
        fill="none"
        stroke="#6B7FFF"
        strokeLinecap="square"
        strokeMiterlimit="10"
        strokeWidth="2"
      ></path>
    </svg>
  );
}

function Anthropic() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M9.77927 2.91699H7.8496L11.3047 11.667H13.1889L9.77927 2.91699ZM4.21485 2.91699L0.804688 11.667H2.73435L3.49677 9.82716H7.0866L7.8041 11.6221H9.73435L6.23435 2.91699H4.21485ZM4.03519 8.21191L5.20185 5.11558L6.41344 8.21191H4.03519Z"
        fill="#e5e5e5"
      />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M7 2.0498L6 2.9998"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.54961 3.99961L1.09961 3.59961"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.9998 6L2.0498 7"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.59961 1.09961L3.99961 2.54961"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.51882 4.84532C4.49943 4.79965 4.49413 4.74922 4.5036 4.70051C4.51307 4.65181 4.53687 4.60704 4.57195 4.57195C4.60704 4.53687 4.65181 4.51307 4.70051 4.5036C4.74922 4.49413 4.79965 4.49943 4.84532 4.51882L10.3453 6.76882C10.3943 6.7889 10.4356 6.824 10.4633 6.86905C10.4911 6.91411 10.5038 6.9668 10.4997 7.01955C10.4956 7.0723 10.4748 7.12238 10.4404 7.16259C10.406 7.2028 10.3598 7.23107 10.3083 7.24332L8.13382 7.76382C8.04405 7.78526 7.96197 7.83113 7.89667 7.89635C7.83136 7.96156 7.78538 8.04358 7.76382 8.13332L7.24382 10.3083C7.2317 10.36 7.20347 10.4064 7.1632 10.441C7.12294 10.4755 7.07273 10.4963 7.01984 10.5005C6.96696 10.5046 6.91413 10.4918 6.869 10.4639C6.82387 10.436 6.78879 10.3945 6.76882 10.3453L4.51882 4.84532Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
