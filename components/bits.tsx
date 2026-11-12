"use client";

import type { Classification, Prominence } from "@/lib/types";

/** Plain-language description of a lean value (-100 indica … +100 sativa). */
export function leanLabel(lean: number, classification: Classification): string {
  const side = lean < 0 ? "indica" : "sativa";
  const a = Math.abs(lean);
  if (classification !== "hybrid" && a >= 70) return `Pure ${classification}`;
  if (a <= 15) return "Balanced hybrid";
  if (a <= 40) return `Hybrid, leans ${side}`;
  if (a <= 70) return `Hybrid, heavy ${side} lean`;
  return `${side === "indica" ? "Indica" : "Sativa"}-dominant`;
}

/** e.g. -40 → "70% indica / 30% sativa" */
export function leanRatio(lean: number): string {
  const sativa = Math.round((lean + 100) / 2);
  return `${100 - sativa}% indica · ${sativa}% sativa`;
}

export function LeanMeter({
  lean,
  classification,
  compact = false,
  note,
}: {
  lean: number;
  classification: Classification;
  compact?: boolean;
  note?: string;
}) {
  const pct = (lean + 100) / 2;
  return (
    <div className={`lean${compact ? " compact" : ""}`}>
      {!compact && (
        <div className="lean-headline">
          <strong>{leanLabel(lean, classification)}</strong>
          <span className="muted small mono">{leanRatio(lean)}</span>
        </div>
      )}
      <div
        className="lean-track"
        role="meter"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={lean}
        aria-label={`Indica to sativa: ${leanLabel(lean, classification)}`}
      >
        <span className="lean-center" />
        <span className="lean-marker" style={{ left: `${pct}%` }} />
      </div>
      {!compact && (
        <div className="lean-scale">
          <span>Indica</span>
          <span>Balanced</span>
          <span>Sativa</span>
        </div>
      )}
      {!compact && note && <div className="small muted">{note}</div>}
    </div>
  );
}

export function TypePill({ classification }: { classification: Classification }) {
  return <span className={`pill pill-${classification}`}>{classification[0].toUpperCase() + classification.slice(1)}</span>;
}

const TERP_COLORS: Record<string, number> = {
  myrcene: 1, "β-myrcene": 1, "beta-myrcene": 1,
  limonene: 2, "d-limonene": 2,
  linalool: 3,
  caryophyllene: 4, "β-caryophyllene": 4, "beta-caryophyllene": 4,
  pinene: 5, "α-pinene": 5, "alpha-pinene": 5, "β-pinene": 5, "beta-pinene": 5,
  humulene: 6, "α-humulene": 6, "alpha-humulene": 6,
  terpinolene: 7,
  ocimene: 8, bisabolol: 8, "α-bisabolol": 8,
};
export function terpColor(name: string): string {
  const key = name.trim().toLowerCase();
  let idx = TERP_COLORS[key];
  if (!idx) {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    idx = (h % 8) + 1;
  }
  return `var(--tp${idx})`;
}

const PROMINENCE_LEVEL: Record<Prominence, number> = { dominant: 3, major: 2, minor: 1 };
export function ProminenceBar({ prominence }: { prominence: Prominence }) {
  const n = PROMINENCE_LEVEL[prominence] ?? 1;
  return (
    <span className="terp-bar" title={prominence} aria-label={prominence}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "on" : ""} />
      ))}
    </span>
  );
}

export function Stars({ value, onChange, size }: { value: number; onChange?: (v: number) => void; size?: "sm" }) {
  return (
    <span className={`stars${size ? " " + size : ""}`} role={onChange ? "radiogroup" : "img"} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) =>
        onChange ? (
          <button
            key={i}
            type="button"
            className={`star${i <= value ? " on" : ""}`}
            role="radio"
            aria-checked={i === value}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i === value ? 0 : i)}
          >
            ★
          </button>
        ) : (
          <span key={i} className={`star${i <= value ? " on" : ""}`}>★</span>
        ),
      )}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <span className="score" aria-label={`${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= score ? "on" : ""} />
      ))}
    </span>
  );
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
