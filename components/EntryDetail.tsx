"use client";

import { useState } from "react";
import type { Entry } from "@/lib/types";
import { ProfileView } from "./ProfileView";
import { Stars, formatDate } from "./bits";

const RECOMMEND_LABEL = { yes: "Would recommend", depends: "Recommend for some", no: "Wouldn't recommend" } as const;
const INTENSITY = ["", "Barely there", "Mild", "Moderate", "Strong", "Knockout"];

export function EntryDetail({
  entry,
  onEdit,
  onDeleted,
}: {
  entry: Entry;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else setError("Couldn't delete this session. Try again.");
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="row between detail-head" style={{ alignItems: "flex-start" }}>
          <div className="stack-sm" style={{ minWidth: 0 }}>
            <h1>{entry.product}</h1>
            <div className="brandline">
              {[entry.brand, entry.form, entry.thc != null ? `${entry.thc}% THC` : null, formatDate(entry.date)].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={onEdit}>Edit</button>
            {confirming ? (
              <>
                <button className="btn btn-sm btn-danger" onClick={remove}>Delete for good</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Keep</button>
              </>
            ) : (
              <button className="btn btn-sm btn-ghost btn-danger" onClick={() => setConfirming(true)}>Delete</button>
            )}
          </div>
        </div>
        {error && <div className="notice error">{error}</div>}

        <div className="row" style={{ gap: 16 }}>
          {entry.rating > 0 && <Stars value={entry.rating} />}
          {entry.recommend && (
            <span className={`pill ${entry.recommend === "yes" ? "pill-hybrid" : entry.recommend === "no" ? "" : "pill-sativa"}`} style={entry.recommend === "no" ? { ["--c" as string]: "var(--danger)" } : undefined}>
              {RECOMMEND_LABEL[entry.recommend]}
            </span>
          )}
        </div>
        {entry.recommend_to && (
          <div><span className="label">Best for · </span>{entry.recommend_to}</div>
        )}
        {entry.review && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.review}</p>}

        <hr className="divider" />
        <div className="stack-sm">
          <div className="row between">
            <div className="section-title">How it felt</div>
            <span className="small muted">Intensity: {INTENSITY[entry.feel.intensity]}</span>
          </div>
          {entry.feel.tags.length > 0 ? (
            <div className="chips">
              {entry.feel.tags.map((t) => <span className="chip" key={t}>{t}</span>)}
            </div>
          ) : (
            <div className="small muted">No effects logged.</div>
          )}
          {entry.feel.notes && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.feel.notes}</p>}
        </div>
      </section>

      {entry.profile ? (
        <section className="panel">
          <ProfileView profile={entry.profile} felt={entry.feel.tags} />
        </section>
      ) : (
        <section className="panel small muted">
          No strain info for this session. Edit it and press “Look up strain &amp; brand” to add terpenes, lean and brand reputation.
        </section>
      )}
    </div>
  );
}
