"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { createJourneyScene } from "./bot-journey-scene";
import styles from "./bot-journey.module.css";

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

export default function BotJourneySection() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const rendererRef = useRef<ReturnType<typeof createJourneyScene> | null>(null);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, () => true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, visibleSnapshot, () => false);
  const running = playing && inView && pageVisible && !reducedMotion;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .15 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

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
      canvas.dataset.time = time.toFixed(2);
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
      if (previous) timeRef.current += Math.min((now - previous) / 1000, .08);
      previous = now;
      // One clock drives the field. React does not rerender on animation frames.
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

  function restart() {
    timeRef.current = 0;
    rendererRef.current = createJourneyScene();
    setPlaying(true);
  }

  return (
    <section id="bot-journey" className={styles.section} aria-labelledby="bot-journey-title">
      <div className={styles.container}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>The agent at work</p>
            <h2 id="bot-journey-title">From signal<br />to execution.</h2>
          </div>
          <p className={styles.intro}>A market that never stops moving.<br /> An agent watching for your next opportunity.</p>
        </header>
        <figure className={styles.journey}>
          <div className={styles.stage} ref={stageRef}>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          </div>
          <figcaption className={styles.srOnly}>
            A bot stays in a fixed central disc while token circles continuously fall from above,
            gently move around one another, and pass the bot. Fine lines connect nearby tokens to the agent.
            This is a conceptual animation, not a live market feed.
          </figcaption>
        </figure>
        <div className={styles.footer}>
          <span>Concept animation · Example tokens</span>
          {!reducedMotion && (
            <div className={styles.controls}>
              <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause animation" : "Play animation"} title={playing ? "Pause animation" : "Play animation"}>
                {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
              </button>
              <button type="button" onClick={restart} aria-label="Restart animation" title="Restart animation">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

