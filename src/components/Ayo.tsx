"use client";

import { motion, useReducedMotion } from "motion/react";

export type Mood = "happy" | "wave" | "excited" | "thinking" | "sad" | "wink";

const INK = "#202124";
const BLUE = "#4285F4";
const SHADE = "#2f6fd6";
const ANTENNA = ["#EA4335", "#FBBC05", "#34A853", "#4285F4", "#EA4335"];

/**
 * Ayo, the DevFest Ilorin buddy. A round little helper with an antenna that
 * cycles through the festival colours. Purely decorative: pass `label` only
 * when the character itself carries meaning.
 */
export function Ayo({ mood = "happy", size = 120, label }: { mood?: Mood; size?: number; label?: string }) {
  const still = useReducedMotion();

  const body = still
    ? {}
    : mood === "excited"
      ? { y: [0, -16, 0, 0], scaleY: [1, 1.04, 0.94, 1], transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.4, ease: [0.4, 0, 0.05, 1] as const } }
      : mood === "sad"
        ? { y: [0, 2, 0], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const } }
        : { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <motion.svg
      viewBox="0 0 120 136"
      width={size}
      height={(size * 136) / 120}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ overflow: "visible", display: "block" }}
    >
      {/* ground shadow */}
      <ellipse cx="60" cy="130" rx="34" ry="5" fill={INK} opacity="0.08" />
      <motion.g animate={body} style={{ originX: "60px", originY: "128px" }}>
        {/* feet */}
        <ellipse cx="44" cy="122" rx="12" ry="7" fill="#FBBC05" />
        <ellipse cx="76" cy="122" rx="12" ry="7" fill="#FBBC05" />
        <ellipse cx="44" cy="124" rx="10" ry="3.5" fill="#e3a704" />
        <ellipse cx="76" cy="124" rx="10" ry="3.5" fill="#e3a704" />

        {/* antenna */}
        <motion.g
          animate={still ? {} : { rotate: mood === "thinking" ? [0, 12, 0] : [0, -8, 8, 0] }}
          transition={{ duration: mood === "thinking" ? 1.6 : 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "60px", originY: "26px" }}
        >
          <path d="M60 26 L60 9" stroke={SHADE} strokeWidth="4.5" strokeLinecap="round" />
          <motion.circle
            cx="60"
            cy="8"
            r="7"
            initial={{ fill: ANTENNA[0] }}
            animate={still ? {} : { fill: ANTENNA }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <circle cx="57.5" cy="5.5" r="2" fill="#fff" opacity="0.7" />
        </motion.g>

        {/* arms */}
        <ellipse cx="13" cy="84" rx="8" ry="13" fill={SHADE} transform="rotate(18 13 84)" />
        <motion.g
          style={{ originX: "104px", originY: "74px" }}
          animate={
            still
              ? {}
              : mood === "wave"
                ? { rotate: [0, -38, -8, -38, 0] }
                : mood === "excited"
                  ? { rotate: [0, -50, 0] }
                  : {}
          }
          transition={{ duration: mood === "wave" ? 1.4 : 0.9, repeat: Infinity, repeatDelay: mood === "wave" ? 1.2 : 0.4 }}
        >
          <ellipse cx="107" cy="84" rx="8" ry="13" fill={SHADE} transform="rotate(-18 107 84)" />
        </motion.g>

        {/* body */}
        <path d="M60 24 C96 24 109 52 109 80 C109 108 88 122 60 122 C32 122 11 108 11 80 C11 52 24 24 60 24 Z" fill={BLUE} />
        <path d="M11 80 C11 108 32 122 60 122 C88 122 109 108 109 80 C104 100 86 112 60 112 C34 112 16 100 11 80 Z" fill={SHADE} />
        <ellipse cx="60" cy="94" rx="27" ry="17" fill="#c6dafc" />
        <path d="M30 40 C36 32 46 28 54 28" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.45" />

        {/* cheeks */}
        <ellipse cx="29" cy="78" rx="6.5" ry="4" fill="#EA4335" opacity="0.35" />
        <ellipse cx="91" cy="78" rx="6.5" ry="4" fill="#EA4335" opacity="0.35" />

        <Eyes mood={mood} still={!!still} />
        <Mouth mood={mood} />
      </motion.g>
    </motion.svg>
  );
}

function Eyes({ mood, still }: { mood: Mood; still: boolean }) {
  const look = mood === "thinking" ? { x: 2, y: -4 } : mood === "sad" ? { x: 0, y: 3 } : { x: 1, y: 1 };
  const blink = still
    ? {}
    : { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity } };

  const eye = (cx: number, closed: boolean) =>
    closed ? (
      <path d={`M${cx - 10} 62 Q${cx} 52 ${cx + 10} 62`} stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
    ) : (
      <motion.g animate={blink} style={{ originX: `${cx}px`, originY: "60px" }}>
        <ellipse cx={cx} cy="60" rx="13" ry="15" fill="#fff" />
        <circle cx={cx + look.x} cy={62 + look.y} r="7" fill={INK} />
        <circle cx={cx + look.x + 2.5} cy={59 + look.y} r="2.4" fill="#fff" />
      </motion.g>
    );

  return (
    <g>
      {mood === "sad" && (
        <>
          <path d="M33 44 L50 48" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M87 44 L70 48" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
      {eye(44, mood === "excited")}
      {eye(76, mood === "wink" || mood === "excited")}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "excited":
      return (
        <g>
          <path d="M45 80 Q60 102 75 80 Z" fill={INK} />
          <path d="M52 89 Q60 96 68 89 Q60 86 52 89 Z" fill="#EA4335" />
        </g>
      );
    case "sad":
      return <path d="M50 90 Q60 82 70 90" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case "thinking":
      return <ellipse cx="64" cy="86" rx="4.5" ry="4" fill={INK} />;
    default:
      return <path d="M49 82 Q60 93 71 82" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />;
  }
}

/** Ayo with a speech bubble, Duolingo style. */
export function AyoSays({
  children,
  mood = "happy",
  size = 96,
  side = "right",
}: {
  children: React.ReactNode;
  mood?: Mood;
  size?: number;
  side?: "right" | "below";
}) {
  return (
    <div className={`ayo-says ayo-says--${side}`}>
      <div className="ayo-says__buddy">
        <Ayo mood={mood} size={size} />
      </div>
      <motion.div
        className="bubble"
        key={typeof children === "string" ? children : undefined}
        initial={{ opacity: 0, scale: 0.92, x: side === "right" ? -6 : 0 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        aria-live="polite"
      >
        {children}
      </motion.div>
    </div>
  );
}
