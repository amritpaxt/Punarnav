/**
 * Punarnav motion system
 * ----------------------
 * Personality: "growth, not flash". Things grow, settle and breathe like plants.
 * Nothing bounces for fun, nothing punishes, nothing makes the collector wait.
 *
 * Six motion themes, each tied to a part of the product:
 *   1. BREEZE  – navigation and content entering (all roles)
 *   2. SPROUT  – growth and reward (resident: streak plant, points, green rating)
 *   3. DROOP   – gentle setback (mixed bin; soft, never alarming)
 *   4. FIRM    – collector screens (fast, no bounce, never blocks the next tap)
 *   5. PULSE   – data and trust (admin charts, leaderboard, Cedar decision log)
 *   6. UNFOLD  – brand moment (splash logo, once per session)
 *
 * Usage: import the variants/transitions below into existing components and wrap
 * elements with <motion.div variants={...} initial="hidden" animate="show" />.
 * Always pass the result through `useSafeMotion()` so prefers-reduced-motion is respected.
 */
import { animate, useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

/** Seconds. Keep UI motion under 0.4s; only brand/story moments go longer. */
export const duration = {
  instant: 0.1, // press feedback
  fast: 0.15, // collector screen, toggles
  base: 0.22, // page transitions, cards entering
  slow: 0.4, // confirmations, leaf growth
  data: 0.6, // bars, count-ups
  story: 0.9, // trend line draw, splash
} as const;

export const ease = {
  /** Soft deceleration, like a leaf settling. Default for anything entering. */
  breeze: [0.22, 1, 0.36, 1] as const,
  /** Neutral in-out for things moving between two places. */
  settle: [0.4, 0, 0.2, 1] as const,
  /** Quick exit: things leave faster than they arrive. */
  leave: [0.4, 0, 1, 1] as const,
};

export const spring = {
  /** Slight overshoot: growth and rewards (leaves, points badge, streak). */
  sprout: { type: "spring", stiffness: 260, damping: 18, mass: 0.8 } as Transition,
  /** No overshoot: collector buttons and anything that must feel solid. */
  firm: { type: "spring", stiffness: 520, damping: 38 } as Transition,
  /** Smooth reordering: leaderboard rank changes, list layout shifts. */
  glide: { type: "spring", stiffness: 300, damping: 32 } as Transition,
};

/** Colours used by motion effects (mirror the CSS tokens). */
export const motionColor = {
  gold: "#C9A96E",
  sage: "#A8C69F",
  segregated: "#7BC47F",
  mixed: "#D9705A",
} as const;

/* ------------------------------------------------------------------ */
/* 1. BREEZE – navigation and content entering                         */
/* ------------------------------------------------------------------ */

/** Page / route transition: fade + 8px rise in, quicker fade out. */
export const breezePage: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.breeze } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.leave } },
};

/** Parent for lists of cards: children drift in one after another. */
export const breezeList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const breezeItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.breeze } },
};

/** Bottom sheet / modal. */
export const breezeSheet: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: spring.glide },
  exit: { y: "100%", transition: { duration: duration.base, ease: ease.leave } },
};

/* ------------------------------------------------------------------ */
/* 2. SPROUT – growth and reward (resident)                            */
/* ------------------------------------------------------------------ */

/**
 * One leaf on the streak plant. Put `style={{ transformOrigin: "bottom center" }}`
 * on the leaf so it grows out of the stem. Use `custom={index}` for the stagger.
 */
export const sproutLeaf: Variants = {
  hidden: { scale: 0, rotate: -25, opacity: 0 },
  show: (i: number = 0) => ({
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { ...spring.sprout, delay: i * 0.06 },
  }),
};

/** The whole plant: healthy vs drooping (see DROOP). Animate between these states. */
export const plantState: Variants = {
  healthy: { rotate: 0, filter: "saturate(1)", transition: { duration: duration.slow, ease: ease.settle } },
  drooping: { rotate: -6, filter: "saturate(0.6)", transition: { duration: 0.6, ease: ease.settle } },
};

/** Streak milestone (7 / 30 days): one soft gold glow, not fireworks. */
export const sproutMilestone: Variants = {
  idle: { boxShadow: "0 0 0 0 rgba(201,169,110,0)" },
  celebrate: {
    boxShadow: [
      "0 0 0 0 rgba(201,169,110,0.0)",
      "0 0 0 10px rgba(201,169,110,0.35)",
      "0 0 0 18px rgba(201,169,110,0.0)",
    ],
    transition: { duration: 1.1, ease: ease.breeze },
  },
};

/** Points badge "pop" when the number changes. Pair with useCountUp below. */
export const sproutPoints: Variants = {
  idle: { scale: 1 },
  bump: { scale: [1, 1.12, 1], transition: { duration: duration.slow, ease: ease.breeze } },
};

/**
 * Leaf burst for a SEGREGATED rating: render ~6 small leaf shapes absolutely positioned
 * at the button centre, each with `custom={index}` and `total={6}` baked into the angle.
 * Total time < 400ms so the collector is never kept waiting.
 */
export const sproutBurstParticle: Variants = {
  hidden: { opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 },
  show: (i: number = 0) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return {
      opacity: [0, 1, 0],
      x: Math.cos(angle) * 36,
      y: Math.sin(angle) * 36,
      scale: [0.4, 1, 0.8],
      rotate: (i % 2 ? 1 : -1) * 40,
      transition: { duration: 0.38, ease: ease.breeze },
    };
  },
};

/** Tick that draws itself (use on an SVG <motion.path> with pathLength). */
export const sproutTick: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.25, ease: ease.breeze } },
};

/* ------------------------------------------------------------------ */
/* 3. DROOP – gentle setback (mixed bin)                               */
/* ------------------------------------------------------------------ */

/** Gentle 2-cycle shake for a MIXED rating. Small amplitude: a nudge, not an error. */
export const droopShake: Variants = {
  still: { x: 0 },
  shake: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.32, ease: "easeInOut" } },
};

/** Resident "gentle note" card for a mixed day: slides in softly, no red flash. */
export const droopNote: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.breeze, delay: 0.15 } },
};

/* ------------------------------------------------------------------ */
/* 4. FIRM – collector screens                                         */
/* ------------------------------------------------------------------ */

/** Rating buttons: instant press feedback, selected state, no bounce. */
export const firmButton = {
  whileTap: { scale: 0.97, transition: { duration: duration.instant } },
} as const;

export const firmSelect: Variants = {
  idle: { scale: 1, outlineColor: "rgba(237,230,214,0)" },
  selected: { scale: 1.02, outlineColor: "rgba(237,230,214,1)", transition: spring.firm },
};

/** Next flat card replaces the previous one: quick slide, keeps the rhythm of rounds. */
export const firmNextFlat: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: duration.fast, ease: ease.breeze } },
  exit: { opacity: 0, x: -24, transition: { duration: duration.fast, ease: ease.leave } },
};

/** Route progress bar ("18/40 done"): animate width with this. */
export const firmProgress: Transition = { duration: duration.slow, ease: ease.settle };

/* ------------------------------------------------------------------ */
/* 5. PULSE – data and trust (admin, leaderboard, Cedar log)           */
/* ------------------------------------------------------------------ */

/** Horizontal bar growing to its value. Set `style={{ originX: 0 }}` and custom={percent 0-100}. */
export const pulseBar: Variants = {
  hidden: { scaleX: 0 },
  show: (pct: number = 100) => ({
    scaleX: pct / 100,
    transition: { duration: duration.data, ease: ease.breeze },
  }),
};

export const pulseBarList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Leaderboard rows: add `layout` and `transition={spring.glide}` to each row so rank changes slide. */
export const pulseRowLayout: Transition = spring.glide;

/** Trend line that draws left to right (SVG <motion.path>). */
export const pulseLine: Variants = {
  hidden: { pathLength: 0 },
  show: { pathLength: 1, transition: { duration: duration.story, ease: ease.settle } },
};

/** Cedar decision log: new row slides in from the top with a coloured ring pulse. */
export const pulseLogRow = (decision: "ALLOW" | "DENY"): Variants => {
  const c = decision === "ALLOW" ? "123,196,127" : "217,112,90";
  return {
    hidden: { opacity: 0, y: -12 },
    show: {
      opacity: 1,
      y: 0,
      boxShadow: [`0 0 0 0 rgba(${c},0.55)`, `0 0 0 8px rgba(${c},0)`],
      transition: { duration: 0.5, ease: ease.breeze },
    },
  };
};

/* ------------------------------------------------------------------ */
/* 6. UNFOLD – brand moment (splash)                                   */
/* ------------------------------------------------------------------ */

/** Logo leaf: unfolds from the stem once, ~0.9s. Then the wordmark fades up. */
export const unfoldLeaf: Variants = {
  hidden: { scale: 0.2, rotate: -60, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { ...spring.sprout, duration: duration.story } },
};

export const unfoldWordmark: Variants = {
  hidden: { opacity: 0, y: 8, letterSpacing: "0.12em" },
  show: {
    opacity: 1,
    y: 0,
    letterSpacing: "0.02em",
    transition: { duration: 0.6, ease: ease.breeze, delay: 0.45 },
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Opacity-only fallback used when the user prefers reduced motion. */
const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

/**
 * Wrap any variants: returns them unchanged normally, or an instant opacity-only
 * version when prefers-reduced-motion is on.
 *   const page = useSafeMotion(breezePage);
 */
export function useSafeMotion(variants: Variants): Variants {
  const reduce = useReducedMotion();
  return reduce ? reducedVariants : variants;
}

/**
 * Count a number up from its previous value to the new one (points, kg, %).
 *   const shown = useCountUp(points);  ->  <span>{shown}</span>
 */
export function useCountUp(value: number, seconds: number = duration.data): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: seconds,
      ease: ease.breeze,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, seconds, reduce]);

  return shown;
}

/**
 * Theme map: which motion theme each screen uses.
 * Handy for Codex and teammates to stay consistent.
 */
export const screenMotion = {
  splash: ["UNFOLD"],
  signIn: ["BREEZE"],
  residentHome: ["BREEZE", "SPROUT", "DROOP"],
  residentHistory: ["BREEZE"],
  leaderboard: ["PULSE"],
  rewards: ["BREEZE", "SPROUT"],
  collectorRoute: ["FIRM"],
  collectorRate: ["FIRM", "SPROUT (burst only)", "DROOP (shake only)"],
  adminDashboard: ["PULSE"],
  adminPermissions: ["PULSE"],
} as const;
