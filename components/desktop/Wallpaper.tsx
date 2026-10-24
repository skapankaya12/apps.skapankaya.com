"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { keepVariant, noteFor, WELCOME, WALLPAPERS, type Wallpaper as WallpaperId } from "@/lib/desktop";
import { FOUNDERS } from "@/lib/founders";
import { useClock, usePrefs } from "./hooks";

/**
 * What sits behind the folders. Four kinds: the Landing page with its welcome,
 * words on the wallpaper (Keep going, Daily note), and NASA's photographs from
 * the space station, credited in the footer strip.
 *
 * Keep going shuffles between two versions: the words alone, and the words
 * over a row of founders who built alone and kept going, each card a link to
 * their profile. That version is the one wallpaper with links on it, so it is
 * the one not hidden from screen readers.
 *
 * Today's note depends on the visitor's date, so it is only drawn once the
 * browser has said what day it is.
 */
export function Wallpaper({ id }: { id: WallpaperId }) {
  const now = useClock();
  const { noteShift, keepShift } = usePrefs();
  const meta = WALLPAPERS.find((w) => w.id === id);
  const founders = id === "keepgoing" && keepVariant(keepShift) === "founders";

  return (
    <div className={`sm-wallpaper wall-layer-${id}`} aria-hidden={founders ? undefined : true}>
      {meta?.thumb && (
        // The full photo, behind everything. Lazy would only delay the one image that matters here.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sm-wall-photo" src={`/wallpapers/${id}.jpg`} alt="" />
      )}
      {id === "landing" && (
        <div className="sm-wall-welcome">
          <p className="sm-welcome-hello">{WELCOME.hello}</p>
          <p className="sm-welcome-lead">
            {WELCOME.lead} <RollingWord words={WELCOME.roles} />
          </p>
          <p className="sm-welcome-aside">{WELCOME.aside}</p>
        </div>
      )}
      {id === "keepgoing" && !founders && <p className="sm-wall-words">keep going.</p>}
      {founders && (
        <motion.section
          className="sm-wall-founders"
          aria-label="Founders who built alone and kept going"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="sm-founders-h">keep going.</p>
          <p className="sm-founders-sub">they built alone, and kept going.</p>
          <ul className="sm-founders">
            {FOUNDERS.map((f) => (
              <li key={f.handle} className="sm-founder">
                <a href={`https://x.com/${f.handle}`} target="_blank" rel="noopener noreferrer" className="sm-founder-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/founders/${f.handle}.jpg`} alt="" loading="lazy" />
                  <span className="sm-founder-meta">
                    <b>{f.name}</b>
                    <small>{f.built}</small>
                    <em>@{f.handle}</em>
                  </span>
                </a>
                {f.linkedin && (
                  <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="sm-founder-in" aria-label={`${f.name} on LinkedIn`}>
                    in
                  </a>
                )}
              </li>
            ))}
          </ul>
        </motion.section>
      )}
      {id === "quotes" && now && (
        <figure className="sm-wall-note">
          {/* Keyed by the line, so a shuffle fades the new one in. */}
          <motion.blockquote key={noteFor(now, noteShift)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {noteFor(now, noteShift)}
          </motion.blockquote>
        </figure>
      )}
    </div>
  );
}

/**
 * The word after "solo", turning every couple of seconds. It rolls like a
 * flip counter: the old word lifts out of the top as the new one rises in, and
 * the slot's width eases to the new word so the line never jumps. With reduced
 * motion asked for, it swaps in place instead.
 */
function RollingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const still = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2300);
    return () => clearInterval(t);
  }, [words.length]);

  const word = words[i];
  return (
    <motion.span className="sm-roll" layout transition={{ layout: { duration: still ? 0 : 0.4, ease: [0.3, 0.7, 0.2, 1] } }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          className="sm-roll-word"
          initial={still ? { opacity: 0 } : { y: "105%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={still ? { opacity: 0 } : { y: "-105%", opacity: 0 }}
          transition={{ duration: still ? 0.15 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
