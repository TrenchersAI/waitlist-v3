"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Moon, Pause, Play, Sparkles, Zap } from "lucide-react";
import ShootingStarAvatar, { COMET_PALETTES, type ShootingStarState } from "@/src/components/shooting-star-avatar";
import styles from "./avatar-lab.module.css";

const PALETTES = COMET_PALETTES;
const STATES = [
  { id: "default" as const, label: "Idle", icon: Sparkles, description: "Drifting through the quiet. Ready when you are." },
  { id: "working" as const, label: "Working", icon: Zap, description: "Eyes on the mission. A brighter trail, a little more energy." },
  { id: "sleeping" as const, label: "Sleeping", icon: Moon, description: "Recharging for the next adventure. Even stars need rest." },
];

export default function AvatarLab() {
  const [state, setState] = useState<ShootingStarState>("default");
  const [palette, setPalette] = useState(0);
  const [paused, setPaused] = useState(false);
  const [trail, setTrail] = useState(1);
  const selected = PALETTES[palette];
  const currentState = STATES.find((item) => item.id === state)!;

  return (
    <main className={styles.lab} style={{ "--avatar-accent": selected.color } as CSSProperties}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={15} /> Trenchers</Link>
        <span className={styles.labTag}>AVATAR LAB <span>02</span></span>
      </header>

      <div className={styles.intro}>
        <p className={styles.eyebrow}><span /> SOMEWHERE BETWEEN TWO STARS</p>
        <h1>A little piece of<br /><span>the night sky.</span></h1>
        <p className={styles.subtitle}>Meet the comet spirits. A curious gaze,<br className={styles.desktopBreak} /> a trail of stardust, and a light of their own.</p>
      </div>

      <section className={styles.workbench} aria-label="Comet-spirit avatar preview">
        <div className={styles.stage}>
          <div className={styles.stageTop}>
            <span className={styles.stageLabel}><span /> LIVE PREVIEW</span>
            <button className={styles.pause} onClick={() => setPaused(!paused)} aria-label={paused ? "Play animation" : "Pause animation"}>
              {paused ? <Play size={13} /> : <Pause size={13} />}{paused ? "Play" : "Pause"}
            </button>
          </div>
          <div className={styles.orbit} aria-hidden="true" />
          <ShootingStarAvatar state={state} color={selected.color} trailColor={selected.trailColor} paused={paused} trailLength={trail} className={styles.character} />
          <div className={styles.stageBottom}>
            <div><span className={styles.characterName}>{selected.name}</span><span className={styles.characterType}>COMET SPIRIT / 00{palette + 1}</span></div>
            <span className={styles.statePill}><span /> {paused ? "Paused" : currentState.label}</span>
          </div>
        </div>

        <aside className={styles.controls} aria-label="Avatar customization">
          <div className={styles.controlHeading}><Sparkles size={19} /><h2>Make it yours.</h2></div>
          <p className={styles.controlIntro}>Three lights. Three little personalities.</p>

          <fieldset className={styles.fieldset}>
            <legend>01 <span>Personality</span></legend>
            <div className={styles.states}>
              {STATES.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={state === id} onClick={() => setState(id)}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </div>
            <p className={styles.stateDescription} aria-live="polite">{currentState.description}</p>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>02 <span>Starlight</span></legend>
            <div className={styles.palettes}>
              {PALETTES.map((item, index) => (
                <button key={item.name} type="button" aria-pressed={palette === index} onClick={() => setPalette(index)}>
                  <span className={styles.swatch} style={{ background: `linear-gradient(135deg, ${item.color} 30%, ${item.trailColor})` }}>{palette === index && <Check size={14} />}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.trailControl}>
            <label htmlFor="trail-length">03 <span>Comet tail</span><output htmlFor="trail-length">{Math.round(trail * 100)}%</output></label>
            <input id="trail-length" type="range" min="0.45" max="1.25" step="0.05" value={trail} onChange={(event) => setTrail(Number(event.target.value))} />
            <div className={styles.rangeLabels}><span>Subtle</span><span>Stellar</span></div>
          </div>

          <div className={styles.tip}><ArrowUpRight size={16} /><p>Move your cursor around the star.<br /><span>It might just notice you.</span></p></div>
        </aside>
      </section>

      <div className={styles.caption}><span>{selected.note}</span><span>TWILIGHT SERIES — V.02</span></div>
      <footer className={styles.footer}><span>Made for the trenches. Born in the stars.</span><span>TrenchersAI <span aria-hidden="true">✦</span></span></footer>
    </main>
  );
}
