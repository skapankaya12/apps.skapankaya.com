"use client";

import { useEffect, useState } from "react";
import { TitleBar } from "./apps";

/*
 * Daily tools: four small apps that run on the desktop itself. Everything is
 * kept in this browser's localStorage under one key and never leaves the
 * visitor's computer, which is the same promise the marketplace makes about
 * the tools it sells. These windows only ever render in the browser (nothing
 * opens on arrival), so reading storage when they mount is safe.
 */

const KEY = "sm-daily";

type Task = { id: number; text: string; done: boolean; star: boolean };
type Goal = { id: number; text: string; progress: number };
type Review = { shipped: string; blocked: string; heard: string; next: string };
type Daily = {
  tasks: Task[];
  goals: Goal[];
  focus: { day: string; sessions: number };
  review: Review;
};

const EMPTY: Daily = {
  tasks: [],
  goals: [],
  focus: { day: "", sessions: 0 },
  review: { shipped: "", blocked: "", heard: "", next: "" },
};

function load(): Daily {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return EMPTY;
  }
}

/** One slice of the saved state, written back on every change. */
function useDaily<K extends keyof Daily>(key: K): [Daily[K], (next: Daily[K]) => void] {
  const [value, setValue] = useState<Daily[K]>(() => load()[key]);
  const save = (next: Daily[K]) => {
    setValue(next);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...load(), [key]: next }));
    } catch {}
  };
  return [value, save];
}

const today = () => new Date().toDateString();

/* --------------------------------------------------------------- Today */

export function Today() {
  const [tasks, setTasks] = useDaily("tasks");
  const [text, setText] = useState("");
  const sorted = [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || Number(b.star) - Number(a.star));
  const left = tasks.filter((t) => !t.done).length;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: text.trim(), done: false, star: false }]);
    setText("");
  }
  const patch = (id: number, p: Partial<Task>) => setTasks(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <>
      <TitleBar title="Today" />
      <div className="sm-app">
        <div className="sm-app-head">
          <h2>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h2>
          <span>{tasks.length ? `${left} to do` : "Nothing yet"}</span>
        </div>
        <form className="sm-app-add" onSubmit={add}>
          <input id="sm-today-new" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task, press Return" aria-label="New task" />
        </form>
        <ul className="sm-tasks">
          {sorted.map((t) => (
            <li key={t.id} className={t.done ? "is-done" : ""}>
              <label>
                <input type="checkbox" checked={t.done} onChange={() => patch(t.id, { done: !t.done })} />
                <span>{t.text}</span>
              </label>
              <button type="button" className={`sm-star${t.star ? " is-on" : ""}`} aria-label={t.star ? "Unstar" : "Star"} onClick={() => patch(t.id, { star: !t.star })}>
                ★
              </button>
              <button type="button" className="sm-del" aria-label="Delete" onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        {tasks.some((t) => t.done) && (
          <button type="button" className="sm-btn sm-btn-plain sm-app-foot" onClick={() => setTasks(tasks.filter((t) => !t.done))}>
            Clear done
          </button>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Goals */

export function Goals() {
  const [goals, setGoals] = useDaily("goals");
  const [text, setText] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setGoals([...goals, { id: Date.now(), text: text.trim(), progress: 0 }]);
    setText("");
  }

  return (
    <>
      <TitleBar title="Goals" />
      <div className="sm-app">
        <div className="sm-app-head">
          <h2>What are you working towards?</h2>
        </div>
        <form className="sm-app-add" onSubmit={add}>
          <input id="sm-goals-new" value={text} onChange={(e) => setText(e.target.value)} placeholder="A goal, e.g. first 10 paying users" aria-label="New goal" />
        </form>
        <ul className="sm-goals">
          {goals.map((g) => (
            <li key={g.id}>
              <div className="sm-goal-row">
                <span>{g.text}</span>
                <b>{g.progress}%</b>
                <button type="button" className="sm-del" aria-label="Delete goal" onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}>
                  ✕
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={g.progress}
                aria-label={`Progress on ${g.text}`}
                style={{ "--p": `${g.progress}%` } as React.CSSProperties}
                onChange={(e) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, progress: Number(e.target.value) } : x)))}
              />
            </li>
          ))}
        </ul>
        {!goals.length && <p className="sm-app-empty">Three goals at most is plenty. Drag the bar as you go.</p>}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Focus */

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export function Focus() {
  const [stats, setStats] = useDaily("focus");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const sessions = stats.day === today() ? stats.sessions : 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  // When a period runs out: count a finished focus session, switch modes.
  useEffect(() => {
    if (left > 0 || !running) return;
    const t = setTimeout(() => {
      setRunning(false);
      if (mode === "focus") {
        setStats({ day: today(), sessions: sessions + 1 });
        setMode("break");
        setLeft(BREAK_MIN * 60);
      } else {
        setMode("focus");
        setLeft(FOCUS_MIN * 60);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [left, running, mode, sessions, setStats]);

  const total = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <>
      <TitleBar title="Focus" />
      <div className="sm-app sm-focus">
        <span className={`sm-focus-mode${mode === "break" ? " is-break" : ""}`}>{mode === "focus" ? "Focus" : "Break"}</span>
        <div className="sm-focus-ring" style={{ "--p": `${((total - left) / total) * 100}%` } as React.CSSProperties}>
          <span>
            {mm}:{ss}
          </span>
        </div>
        <div className="sm-focus-btns">
          <button type="button" className="sm-btn" onClick={() => setRunning(!running)}>
            {running ? "Pause" : left === total ? "Start" : "Resume"}
          </button>
          <button
            type="button"
            className="sm-btn sm-btn-plain"
            onClick={() => {
              setRunning(false);
              setLeft(total);
            }}
          >
            Reset
          </button>
        </div>
        <p className="sm-app-empty">
          {sessions} {sessions === 1 ? "session" : "sessions"} today
        </p>
      </div>
    </>
  );
}

/* -------------------------------------------------------- Weekly review */

const PROMPTS: { key: keyof Review; label: string; hint: string }[] = [
  { key: "shipped", label: "What shipped this week?", hint: "Features, posts, fixes, conversations." },
  { key: "blocked", label: "What got in the way?", hint: "Be honest, it stays here." },
  { key: "heard", label: "What did users or customers say?", hint: "Quotes beat summaries." },
  { key: "next", label: "Next week's one thing", hint: "If only this gets done, the week was good." },
];

export function WeeklyReview() {
  const [review, setReview] = useDaily("review");
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function copy() {
    const text = PROMPTS.map((p) => `## ${p.label}\n${review[p.key] || "-"}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <>
      <TitleBar
        title="Weekly review"
        right={
          <button type="button" className="sm-btn sm-btn-plain" onClick={copy}>
            {copied ? "Copied" : "Copy as text"}
          </button>
        }
      />
      <div className="sm-app sm-review">
        {PROMPTS.map((p) => (
          <label key={p.key} className="sm-review-q">
            <b>{p.label}</b>
            <textarea
              id={`sm-review-${p.key}`}
              rows={3}
              placeholder={p.hint}
              value={review[p.key]}
              onChange={(e) => setReview({ ...review, [p.key]: e.target.value })}
            />
          </label>
        ))}
        {confirm ? (
          <div className="sm-review-confirm">
            <span>Clear this week&apos;s answers?</span>
            <button
              type="button"
              className="sm-btn"
              onClick={() => {
                setReview(EMPTY.review);
                setConfirm(false);
              }}
            >
              Clear
            </button>
            <button type="button" className="sm-btn sm-btn-plain" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="sm-btn sm-btn-plain sm-app-foot" onClick={() => setConfirm(true)}>
            Start a new week
          </button>
        )}
      </div>
    </>
  );
}
