"use client";

import { useMemo, useRef, useState } from "react";
import { FEEL_TAGS, FORMS, type Entry, type EntryInput, type Recommend } from "@/lib/types";
import { ProfileView } from "./ProfileView";
import { Stars } from "./bits";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function blankEntry(): EntryInput {
  return {
    date: today(),
    brand: "",
    product: "",
    form: "Flower",
    thc: null,
    profile: null,
    feel: { tags: [], intensity: 3, notes: "" },
    rating: 0,
    recommend: null,
    recommend_to: "",
    review: "",
  };
}

const INTENSITY = ["", "Barely there", "Mild", "Moderate", "Strong", "Knockout"];
const RECOMMEND: { v: Recommend; label: string }[] = [
  { v: "yes", label: "Yes" },
  { v: "depends", label: "For some people" },
  { v: "no", label: "No" },
];

export function EntryEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Entry;
  onSaved: (e: Entry) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EntryInput>(() => {
    if (!initial) return blankEntry();
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = initial;
    return rest;
  });
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const set = <K extends keyof EntryInput>(k: K, v: EntryInput[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setFeel = <K extends keyof EntryInput["feel"]>(k: K, v: EntryInput["feel"][K]) =>
    setDraft((d) => ({ ...d, feel: { ...d.feel, [k]: v } }));

  // Expected effects from the lookup come first, then the common list.
  const tagOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { tag: string; expected: boolean }[] = [];
    const add = (tag: string, expected: boolean) => {
      const k = tag.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ tag, expected });
    };
    draft.profile?.effects.forEach((t) => add(t, true));
    draft.profile?.side_effects.forEach((t) => add(t, false));
    FEEL_TAGS.forEach((t) => add(t, false));
    draft.feel.tags.forEach((t) => add(t, false));
    return out;
  }, [draft.profile, draft.feel.tags]);

  const toggleTag = (tag: string) => {
    const has = draft.feel.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
    setFeel("tags", has ? draft.feel.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...draft.feel.tags, tag]);
  };

  async function lookup(refresh = false) {
    if (!draft.product.trim()) {
      setLookupError("Enter the product or strain name first.");
      return;
    }
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLooking(true);
    setLookupError(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: draft.brand, product: draft.product, form: draft.form, refresh }),
        signal: ctl.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
      set("profile", data.profile);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setLookupError((e as Error).message);
    } finally {
      setLooking(false);
    }
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(initial ? `/api/entries/${initial.id}` : "/api/entries", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save.");
      onSaved(data as Entry);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      {/* 1. What you're smoking */}
      <section className="panel stack">
        <div className="row between">
          <h2 style={{ fontSize: 20 }}>{initial ? "Edit session" : "New session"}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
        <div className="grid-4">
          <div className="field">
            <label htmlFor="brand">Brand</label>
            <input id="brand" className="input" placeholder="e.g. Jungle Boys" value={draft.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="product">Product / strain</label>
            <input id="product" className="input" placeholder="e.g. Ice Cream Cake" required value={draft.product} onChange={(e) => set("product", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="form">Format</label>
            <select id="form" className="select" value={draft.form} onChange={(e) => set("form", e.target.value as EntryInput["form"])}>
              {FORMS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="thc">THC %</label>
            <input
              id="thc" className="input mono" inputMode="decimal" placeholder="—"
              value={draft.thc ?? ""}
              onChange={(e) => set("thc", e.target.value === "" ? null : Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
            />
          </div>
        </div>
        <div className="row between">
          <div className="field" style={{ maxWidth: 180 }}>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={draft.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="row" style={{ alignSelf: "flex-end" }}>
            {draft.profile && (
              <button type="button" className="btn btn-sm" disabled={looking} onClick={() => lookup(true)}>Refresh info</button>
            )}
            <button type="button" className="btn btn-primary" disabled={looking} onClick={() => lookup(false)}>
              {looking ? "Researching…" : draft.profile ? "Look up again" : "Look up strain & brand"}
            </button>
          </div>
        </div>
        {looking && (
          <div className="stack-sm">
            <div className="loading-bar" />
            <div className="small muted">Searching strain databases and brand reviews. This usually takes 20–60 seconds.</div>
          </div>
        )}
        {lookupError && <div className="notice error">{lookupError}</div>}
      </section>

      {draft.profile && (
        <section className="panel">
          <ProfileView profile={draft.profile} />
        </section>
      )}

      {/* 2. How it made you feel */}
      <section className="panel stack">
        <div className="section-title">How it made you feel</div>
        <div className="stack-sm">
          <div className="small muted">
            Tap everything you felt.{draft.profile && " Dashed ones are what this strain is supposed to do."}
          </div>
          <div className="chips">
            {tagOptions.map(({ tag, expected }) => {
              const on = draft.feel.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
              return (
                <button type="button" key={tag} className={`chip${expected && !on ? " expected" : ""}`} aria-pressed={on} onClick={() => toggleTag(tag)}>
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="row">
            <input
              id="custom-tag" className="input" style={{ maxWidth: 220 }} placeholder="Add your own…"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (customTag.trim()) { toggleTag(customTag.trim()); setCustomTag(""); }
                }
              }}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="intensity">
            Intensity · <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink)" }}>{INTENSITY[draft.feel.intensity]}</span>
          </label>
          <input id="intensity" type="range" min={1} max={5} step={1} className="range" value={draft.feel.intensity} onChange={(e) => setFeel("intensity", Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" className="textarea" placeholder="Onset, how long it lasted, what you did, taste, smoothness…" value={draft.feel.notes} onChange={(e) => setFeel("notes", e.target.value)} />
        </div>
      </section>

      {/* 3. Would you recommend it */}
      <section className="panel stack">
        <div className="section-title">Your verdict</div>
        <div className="row between">
          <div className="row">
            <span className="label">Rating</span>
            <Stars value={draft.rating} onChange={(v) => set("rating", v)} />
          </div>
          <div className="row">
            <span className="label">Recommend?</span>
            <div className="segmented">
              {RECOMMEND.map((r) => (
                <button type="button" key={r.v} aria-pressed={draft.recommend === r.v} onClick={() => set("recommend", draft.recommend === r.v ? null : r.v)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="recommend-to">Who it&apos;s for</label>
          <input id="recommend-to" className="input" placeholder="e.g. Experienced smokers who want to sleep" value={draft.recommend_to} onChange={(e) => set("recommend_to", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="review">What you&apos;d tell a friend</label>
          <textarea id="review" className="textarea" value={draft.review} onChange={(e) => set("review", e.target.value)} />
        </div>
        {saveError && <div className="notice error">{saveError}</div>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Save session"}</button>
        </div>
      </section>
    </form>
  );
}
