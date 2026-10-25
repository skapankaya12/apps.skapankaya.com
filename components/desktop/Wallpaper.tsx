"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { keepVariant, noteFor, WELCOME, WALLPAPERS, type Wallpaper as WallpaperId } from "@/lib/desktop";
import { FOUNDERS, OWNER_X, PINNED_NOTE, type Founder } from "@/lib/founders";
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
export function Wallpaper({
  id,
  onMarketplace,
  onWaitlist,
}: {
  id: WallpaperId;
  /** The Landing page's links. Only the homepage passes them. */
  onMarketplace?: () => void;
  onWaitlist?: () => void;
}) {
  const now = useClock();
  const { noteShift, keepShift } = usePrefs();
  const meta = WALLPAPERS.find((w) => w.id === id);
  const founders = id === "keepgoing" && keepVariant(keepShift) === "founders";
  const landing = id === "landing";

  return (
    <div className={`sm-wallpaper wall-layer-${id}`} aria-hidden={founders || landing ? undefined : true}>
      {meta?.thumb && (
        // The full photo, behind everything. Lazy would only delay the one image that matters here.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sm-wall-photo" src={`/wallpapers/${id}.jpg`} alt="" />
      )}
      {id === "landing" && (
        <div className="sm-wall-welcome">
          <p className="sm-welcome-lead">
            <span className="sm-welcome-line">{WELCOME.lead}</span>
            <span className="sm-welcome-line">
              as a <span className="sm-welcome-solo">solo</span> <RollingWord words={WELCOME.roles} />
            </span>
          </p>
          <p className="sm-welcome-guide">
            {WELCOME.guide}{" "}
            <a
              href="/marketplace"
              className="sm-welcome-link"
              onClick={(e) => {
                if (!onMarketplace || e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onMarketplace();
              }}
            >
              {WELCOME.guideLink}
            </a>
          </p>
          <p className="sm-welcome-aside">{WELCOME.aside}</p>
          <button type="button" className="sm-welcome-waitlist" onClick={onWaitlist}>
            {WELCOME.waitlist}
          </button>
        </div>
      )}
      {id === "keepgoing" && !founders && <p className="sm-wall-words">keep going.</p>}
      {founders && <FoundersWall />}
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

/** The X mark, for links to someone's X profile. */
function XMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.48 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43z" />
    </svg>
  );
}

function FounderCard({ f, hidden }: { f: Founder; hidden?: boolean }) {
  return (
    <li className="sm-fc" aria-hidden={hidden || undefined}>
      <a href={`https://x.com/${f.handle}`} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined} className="sm-fc-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/founders/${f.handle}.jpg`} alt="" loading="lazy" />
        <span className="sm-fc-x">
          <XMark size={11} />
        </span>
        <span className="sm-fc-meta">
          <b>{f.name}</b>
          <small>{f.built}</small>
        </span>
      </a>
    </li>
  );
}

/**
 * Keep going, founders version. A badge and the words on top; a row of
 * portrait cards drifting sideways in a loop, faded at both edges, paused
 * under the pointer; and under it the pinned founder, with Sevval's note and
 * her own handle. Every card links to that person's X. Built for this site
 * after a team-carousel reference; nothing of the reference's code is used.
 *
 * The loop runs two copies of the row end to end; the second copy is hidden
 * from screen readers and the keyboard, so each person is announced once.
 */
function FoundersWall() {
  const row = FOUNDERS.filter((f) => !f.pinned);
  const pinned = FOUNDERS.find((f) => f.pinned);
  return (
    <motion.section
      className="sm-wall-founders"
      aria-label="Founders who kept going"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="sm-founders-h">keep going.</p>
      <p className="sm-founders-sub">solo builders who kept going. follow them on X.</p>

      <div className="sm-fc-viewport">
        <ul className="sm-fc-track">
          {row.map((f) => (
            <FounderCard key={f.handle} f={f} />
          ))}
          {row.map((f) => (
            <FounderCard key={`${f.handle}-again`} f={f} hidden />
          ))}
        </ul>
      </div>

      {pinned && (
        <div className="sm-pinned">
          <span className="sm-pinned-label">pinned</span>
          <a href={`https://x.com/${pinned.handle}`} target="_blank" rel="noopener noreferrer" className="sm-pinned-who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/founders/${pinned.handle}.jpg`} alt="" />
            <span>
              <b>{pinned.name}</b>
              <small>
                @{pinned.handle} · {pinned.built}
              </small>
            </span>
          </a>
          <p className="sm-pinned-note">({PINNED_NOTE})</p>
          <a href={`https://x.com/${OWNER_X}`} target="_blank" rel="noopener noreferrer" className="sm-pinned-me">
            <XMark size={13} />
            <span>@{OWNER_X}</span>
          </a>
        </div>
      )}
    </motion.section>
  );
}
