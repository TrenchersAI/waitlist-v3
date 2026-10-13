"use client";

import { useEffect, useRef } from "react";
import {
  BOT_AVATAR_OVERSCAN,
  BOT_AVATAR_RISE,
  BotAvatarSim,
  botAvatarPresets,
  drawBotAvatarFrame,
  restPose,
  type BotAvatarState,
} from "bot-avatars";

export type ShootingStarState = BotAvatarState;

export const COMET_PALETTES = [
  { name: "Aster", color: "#91e9ff", trailColor: "#f39dcc", note: "Blue starlight, a rose-colored echo. Two trails, one little soul." },
  { name: "Ember", color: "#ffb7d8", trailColor: "#91cfff", note: "The warmth of twilight, carried across a midnight sky." },
  { name: "Dusk", color: "#c3b7ff", trailColor: "#79e5ef", note: "A quiet violet glow, just before the stars wake up." },
] as const;

type ShootingStarAvatarProps = {
  state?: ShootingStarState;
  color?: string;
  trailColor?: string;
  paused?: boolean;
  trailLength?: number;
  size?: number;
  seed?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 400;
const BODY_SIZE = 126;
const HEAD_X = 205;
const HEAD_Y = 245;
// A rounded four-point light core, in the library's 100 × 100 design space.
const COMET_CORE = "M50 3C57 3 59 26 70 32C81 38 97 42 97 49C97 56 79 58 70 65C59 74 57 97 50 97C43 97 40 75 29 66C18 58 3 56 3 49C3 42 20 38 30 31C41 23 43 3 50 3Z";

function pearlTint(hex: string) {
  const channels = [1, 3, 5].map((start) => Math.round(parseInt(hex.slice(start, start + 2), 16) * 0.35 + 255 * 0.65));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.fill();
}

/** Original comet spirit: the bot simulation supplies expressions, while
 * the custom light core and paired, flowing trails share one flight transform. */
export default function ShootingStarAvatar({
  state = "default",
  color = COMET_PALETTES[0].color,
  trailColor = COMET_PALETTES[0].trailColor,
  paused = false,
  trailLength = 1,
  size = 640,
  seed = 0.37,
  className,
}: ShootingStarAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<{ seed: number; sim: BotAvatarSim } | null>(null);
  const timeRef = useRef(seed * 8);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = simulationRef.current?.seed === seed
      ? simulationRef.current.sim
      : new BotAvatarSim(seed, state);
    simulationRef.current = { seed, sim };
    sim.setTurn(0.12);
    sim.setJump({ every: 0, spin: 0, height: 0 });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    sim.setState(state, paused || reducedMotion.matches);

    // The library clears its own square on each draw. Render it separately,
    // then composite it with the comet tail on our transparent scene.
    const body = document.createElement("canvas");
    const bodyCtx = body.getContext("2d");
    if (!bodyCtx) return;
    const bodyExtent = BODY_SIZE * BOT_AVATAR_OVERSCAN;
    const path = new Path2D(COMET_CORE);
    const coreColor = pearlTint(color);
    let dpr = 1;
    let frame = 0;
    let last = 0;
    let inView = true;
    let bounds = canvas.getBoundingClientRect();
    const trail = Math.min(1.25, Math.max(0.45, trailLength));

    const draw = () => {
      const t = timeRef.current;
      const resting = reducedMotion.matches;
      const sleeping = state === "sleeping";
      const working = state === "working";
      const strength = sleeping ? 0.5 : working ? 1 : 0.82;
      const x = HEAD_X + (resting ? 0 : Math.sin(t * 0.55) * 7);
      const y = HEAD_Y + (resting ? 0 : Math.sin(t * 0.85) * (sleeping ? 3 : 7));
      const length = 292 * trail * (sleeping ? 0.8 : 1);
      const flutter = resting ? 0 : Math.sin(t * 0.95) * 6;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(resting ? 0 : Math.sin(t * 0.45) * 0.025);

      const glow = (gx: number, gy: number, radius: number, tint: string, alpha: number) => {
        const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
        halo.addColorStop(0, tint + "b0");
        halo.addColorStop(0.23, tint + "40");
        halo.addColorStop(0.6, tint + "10");
        halo.addColorStop(1, tint + "00");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = halo;
        ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
      };

      // Layer translucent, tapered ribbons instead of using an expensive blur.
      // Each trail branches slightly as it recedes into the night.
      const trailPoint = (u: number, branch: number) => ({
        x: u * length,
        y: -175 * u - Math.sin(u * Math.PI) * (32 + flutter)
          + branch * Math.sin(u * Math.PI * 0.8),
      });
      const ribbon = (tint: string, branch: number, width: number, alpha: number, white = false) => {
        const gradient = ctx.createLinearGradient(0, 0, length, -175);
        gradient.addColorStop(0, "#f3fdff");
        gradient.addColorStop(0.18, white ? "#eefbff" : tint);
        gradient.addColorStop(0.55, tint + "aa");
        gradient.addColorStop(0.83, tint + "30");
        gradient.addColorStop(1, tint + "00");
        ctx.fillStyle = gradient;
        ctx.globalAlpha = alpha * strength;
        ctx.beginPath();
        for (let side = 0; side < 2; side++) {
          for (let i = 0; i <= 40; i++) {
            const u = (side === 0 ? i : 40 - i) / 40;
            const p = trailPoint(u, branch);
            const spread = (2 + Math.sin(u * Math.PI) * 13) * width;
            const py = p.y + spread * (side === 0 ? -1 : 1);
            if (side === 0 && i === 0) ctx.moveTo(p.x, py);
            else ctx.lineTo(p.x, py);
          }
        }
        ctx.closePath();
        ctx.fill();
      };
      ctx.globalCompositeOperation = "screen";
      for (let layer = 5; layer > 0; layer--) {
        ribbon(color, -9, 0.7 + layer * 0.35, 0.045);
      }
      ribbon(color, -9, 0.9, 0.48);
      ribbon(trailColor, 23, 1.1, 0.16);
      ribbon(trailColor, 23, 0.42, 0.62);
      ribbon(color, -9, 0.22, 1, true);
      ribbon(trailColor, 23, 0.07, 0.78, true);

      for (let i = 0; i < 42; i++) {
        const u = (i / 42 + seed * 0.3 + (resting ? 0 : t * (working ? 0.12 : 0.045))) % 1;
        const p = trailPoint(u, i % 2 ? 23 : -9);
        const scatter = Math.sin(i * 12.3 + seed * 8) * (9 + u * 24);
        const alpha = Math.sin(u * Math.PI) * strength * (0.3 + (i % 5) * 0.12);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 3 === 0 ? "#f2fcff" : i % 2 ? trailColor : color;
        if (i % 13 === 0) sparkle(ctx, p.x, p.y + scatter, 2.6);
        else {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + scatter, i % 4 === 0 ? 2.6 : 0.9, 0.65, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A small companion fragment follows its own fine pink/blue arc.
      const companionX = 66 + (resting ? 0 : Math.sin(t * 0.7) * 3);
      const companionY = 44;
      const echo = ctx.createLinearGradient(companionX, companionY, length * 0.88, -145);
      echo.addColorStop(0, "#fff0f7");
      echo.addColorStop(0.16, trailColor);
      echo.addColorStop(0.75, trailColor + "45");
      echo.addColorStop(1, trailColor + "00");
      ctx.strokeStyle = echo;
      ctx.lineCap = "round";
      for (const [width, alpha] of [[7, 0.06], [3, 0.16], [1, 0.85]]) {
        ctx.globalAlpha = alpha * strength;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(companionX, companionY);
        ctx.bezierCurveTo(96, 0, length * 0.49, -93, length * 0.88, -145);
        ctx.stroke();
      }
      glow(companionX, companionY, 25, trailColor, strength);
      ctx.globalAlpha = strength;
      ctx.fillStyle = "#fff5fd";
      sparkle(ctx, companionX, companionY, 5.5);

      glow(0, 0, 110, color, sleeping ? 0.48 : 0.86);
      glow(28, 3, 80, trailColor, 0.28);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      const pose = resting ? restPose(state) : sim.pose;
      // Keep facial behavior, but replace grounded hops with a shared flight
      // transform so the body never separates from its tail.
      drawBotAvatarFrame(bodyCtx, BODY_SIZE, {
        ...pose,
        x: 0,
        y: 0,
        roll: pose.roll * 0.15,
        sx: 1 + (pose.sx - 1) * 0.2,
        sy: 1 + (pose.sy - 1) * 0.2,
      }, {
        ...botAvatarPresets.star,
        path,
        face: "mouth",
        faceY: 51,
        faceScale: 0.76,
        color: coreColor,
        ink: "#233657",
        shading: "plastic",
        typeKey: "comet-spirit",
        depth: 0.3,
        roundness: 1,
        shadow: 0.16,
        highlight: 1.4,
        light: 305,
        rim: 1.1,
        spread: 1.6,
        theme: "dark",
        dpr,
        still: paused || resting,
      });
      ctx.drawImage(body, -bodyExtent / 2, -bodyExtent / 2 - BODY_SIZE * BOT_AVATAR_RISE, bodyExtent, bodyExtent);

      // Small, slow glints give the pearl core a luminous edge.
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.65 + (resting ? 0 : Math.sin(t * 1.1) * 0.12);
      ctx.fillStyle = "#ffffff";
      sparkle(ctx, -27, -31, 5.5);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      sparkle(ctx, -72, -17, 2.8);
      sparkle(ctx, 15, 79, 2.2);
      ctx.restore();
    };

    const running = () => !paused && !reducedMotion.matches && inView && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (!running()) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      // Cap rendering at ~30 fps; decorative avatars do not need 60 fps.
      if (!last || now - last >= 32) {
        timeRef.current += dt;
        sim.update(dt);
        draw();
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw();
      if (running()) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      bounds = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2)
        * Math.max(0.1, Math.min(bounds.width / WIDTH, 1));
      canvas.width = WIDTH * dpr;
      canvas.height = HEIGHT * dpr;
      body.width = Math.ceil(bodyExtent * dpr);
      body.height = Math.ceil(bodyExtent * dpr);
      bodyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    };
    const pointerMove = (event: PointerEvent) => {
      if (paused || reducedMotion.matches || state === "sleeping") return;
      bounds = canvas.getBoundingClientRect();
      const px = ((event.clientX - bounds.left) / bounds.width * WIDTH - HEAD_X) / BODY_SIZE;
      const py = ((event.clientY - bounds.top) / bounds.height * HEIGHT - HEAD_Y) / BODY_SIZE;
      sim.setPointer(Math.max(-1, Math.min(1, px)), Math.max(-1, Math.min(1, py)), 0.65);
    };
    const pointerLeave = () => sim.setPointer(0, 0, 0);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    const resizeObserver = new ResizeObserver(resize);
    resize();
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    reducedMotion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerleave", pointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerleave", pointerLeave);
    };
  }, [color, paused, seed, state, trailColor, trailLength]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className={className}
      role="img"
      aria-label={`Comet-spirit avatar, ${state === "default" ? "idle" : state}${paused ? ", animation paused" : ""}`}
      style={{ display: "block", width: "100%", maxWidth: size, height: "auto", aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
  );
}
