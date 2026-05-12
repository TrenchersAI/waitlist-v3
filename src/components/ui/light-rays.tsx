"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { motion } from "motion/react"

import { cn } from "@/src/lib/utils"

interface LightRaysProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>
  count?: number
  color?: string
  blur?: number
  speed?: number
  length?: string
  /** Left % (0-100) where every ray converges. When set, all rays start at
     this point and fan out across {@link LightRaysProps.spread} degrees —
     spotlight effect. When unset (default), rays scatter across 8-92%
     for an ambient "sunlight through clouds" feel. */
  origin?: number
  /** Total rotation range in degrees when `origin` is set. Default 56
     matches the legacy scattered random behavior; higher = wider fan. */
  spread?: number
}

type LightRay = {
  id: string
  left: number
  rotate: number
  width: number
  swing: number
  delay: number
  duration: number
  intensity: number
}

const createRays = (
  count: number,
  cycle: number,
  origin?: number,
  spread = 56,
): LightRay[] => {
  if (count <= 0) return []

  return Array.from({ length: count }, (_, index) => {
    const left = origin ?? 8 + Math.random() * 84

    // Spotlight: distribute rotations evenly across `spread` so the fan
    // looks intentional, with a small jitter for organic feel.
    // Ambient (origin undefined): random rotation in legacy ±28° range.
    const rotate =
      origin !== undefined && count > 1
        ? -spread / 2 +
          (spread / (count - 1)) * index +
          (Math.random() - 0.5) * 4
        : -28 + Math.random() * 56

    // Spotlight rays are narrower at the source and fan out via rotation.
    // Ambient rays are wide so the random scatter still covers the area.
    const width =
      origin !== undefined
        ? 90 + Math.random() * 70
        : 160 + Math.random() * 160
    const swing = 0.8 + Math.random() * 1.8
    const delay = Math.random() * cycle
    const duration = cycle * (0.75 + Math.random() * 0.5)
    const intensity = 0.6 + Math.random() * 0.5

    return {
      id: `${index}-${Math.round(left * 10)}-${Math.round(rotate * 10)}`,
      left,
      rotate,
      width,
      swing,
      delay,
      duration,
      intensity,
    }
  })
}

const Ray = ({
  left,
  rotate,
  width,
  swing,
  delay,
  duration,
  intensity,
}: LightRay) => {
  return (
    <motion.div
      className="pointer-events-none absolute -top-[12%] left-[var(--ray-left)] h-[var(--light-rays-length)] w-[var(--ray-width)] origin-top -translate-x-1/2 rounded-full bg-linear-to-b from-[color-mix(in_srgb,var(--light-rays-color)_70%,transparent)] to-transparent opacity-0 mix-blend-screen blur-[var(--light-rays-blur)]"
      style={
        {
          "--ray-left": `${left}%`,
          "--ray-width": `${width}px`,
        } as CSSProperties
      }
      initial={{ rotate: rotate }}
      animate={{
        opacity: [0, intensity, 0],
        rotate: [rotate - swing, rotate + swing, rotate - swing],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
        repeatDelay: duration * 0.1,
      }}
    />
  )
}

export function LightRays({
  className,
  style,
  count = 7,
  color = "rgba(160, 210, 255, 0.2)",
  blur = 36,
  speed = 14,
  length = "70vh",
  origin,
  spread = 56,
  ref,
  ...props
}: LightRaysProps) {
  const [rays, setRays] = useState<LightRay[]>([])
  const cycleDuration = Math.max(speed, 0.1)
  const isSpotlight = origin !== undefined

  useEffect(() => {
    setRays(createRays(count, cycleDuration, origin, spread))
  }, [count, cycleDuration, origin, spread])

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]",
        className
      )}
      style={
        {
          "--light-rays-color": color,
          "--light-rays-blur": `${blur}px`,
          "--light-rays-length": length,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        {isSpotlight ? (
          // Single radial centered on the spotlight origin — looks like the
          // light source itself glowing through the top.
          <div
            aria-hidden
            className="absolute inset-0 opacity-90"
            style={
              {
                background: `radial-gradient(circle at ${origin}% 0%, color-mix(in srgb, var(--light-rays-color) 70%, transparent), transparent 55%)`,
              } as CSSProperties
            }
          />
        ) : (
          <>
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={
                {
                  background:
                    "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--light-rays-color) 45%, transparent), transparent 70%)",
                } as CSSProperties
              }
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={
                {
                  background:
                    "radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--light-rays-color) 35%, transparent), transparent 75%)",
                } as CSSProperties
              }
            />
          </>
        )}
        {rays.map((ray) => (
          <Ray key={ray.id} {...ray} />
        ))}
      </div>
    </div>
  )
}
