"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BotAvatar, type BotAvatarType } from "bot-avatars";
import { AnimatePresence, motion } from "motion/react";
import { createJourneyScene } from "./bot-journey-scene";
import styles from "./bot-journey.module.css";

const AVATAR_VARIANTS = [
  "clover",
  "star",
  "cat",
  "ghost",
  "flower",
  "alien",
  "cloud",
  "blob",
] as const satisfies readonly BotAvatarType[];

const MORPH_HOLD_MS = 3600;
const MORPH_FADE_S = 1.05;

function avatarSizeFor(stageWidth: number) {
  const world = stageWidth < 640 ? 980 : 1680;
  const disc = 93 * 2 * (stageWidth / world);
  return Math.max(56, Math.round(disc * 0.64));
}

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function reducedMotionSnapshot() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
function visibleSnapshot() { return document.visibilityState === "visible"; }

/** Token field around the agent. Plays while the stage is on screen. */
export default function BotJourneyVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const rendererRef = useRef<ReturnType<typeof createJourneyScene> | null>(null);
  const [inView, setInView] = useState(false);
  const [avatarSize, setAvatarSize] = useState(120);
  const [variantIndex, setVariantIndex] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, () => true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, visibleSnapshot, () => false);
  const running = inView && pageVisible && !reducedMotion;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(stage);
    const measure = () => setAvatarSize(avatarSizeFor(stage.getBoundingClientRect().width));
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setVariantIndex((index) => (index + 1) % AVATAR_VARIANTS.length);
    }, MORPH_HOLD_MS);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !stage || !ctx) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let lastPaint = 0;
    if (!rendererRef.current) rendererRef.current = createJourneyScene();

    function draw() {
      if (!canvas || !ctx) return;
      const time = reducedMotion ? 4.8 : timeRef.current;
      rendererRef.current?.(ctx, width, height, time);
    }
    function resize() {
      if (!canvas || !ctx || !stage) return;
      const bounds = stage.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function animate(now: number) {
      if (previous) timeRef.current += Math.min((now - previous) / 1000, 0.08);
      previous = now;
      if (now - lastPaint >= 1000 / 30) {
        draw();
        lastPaint = now;
      }
      frame = requestAnimationFrame(animate);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    if (running) frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [running, reducedMotion]);

  return (
    <div className={styles.stage} ref={stageRef}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.agent}>
        <AnimatePresence initial={false}>
          <motion.div
            key={AVATAR_VARIANTS[variantIndex]}
            className={styles.agentShape}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : MORPH_FADE_S, ease: "easeInOut" }}
          >
            <BotAvatar
              type={AVATAR_VARIANTS[variantIndex]}
              face="mouth"
              state="default"
              size={avatarSize}
              theme="dark"
              interactive={false}
              paused={!running}
              turn={0.45}
              jumpEvery={0}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className={styles.srOnly}>
        An avatar stays in a fixed central disc and morphs between shapes —
        clover, star, cat, ghost, flower, alien, cloud, and blob — while
        meme-coin marks move around it. This is a conceptual animation, not a
        live market feed.
      </p>
    </div>
  );
}
