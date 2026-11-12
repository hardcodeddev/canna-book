"use client";

import type { StrainProfile } from "@/lib/types";
import { LeanMeter, ProminenceBar, ScoreBar, TypePill, terpColor } from "./bits";

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/** The looked-up strain + brand profile. Pass `felt` to mark which expected effects you actually got. */
export function ProfileView({ profile, felt }: { profile: StrainProfile; felt?: string[] }) {
  const feltSet = felt ? new Set(felt.map(norm)) : null;
  const facts = [
    ["Lineage", profile.lineage],
    ["Typical THC", profile.thc_range],
    ["Typical CBD", profile.cbd_range],
    ["Best for", profile.best_for],
  ].filter(([, v]) => v);

  return (
    <div className="stack">
      <div className="row between">
        <div className="row">
          <TypePill classification={profile.classification} />
          <span className="small muted">
            {profile.strain_name}
            {profile.aliases.length > 0 && ` · aka ${profile.aliases.join(", ")}`}
          </span>
        </div>
        <span className={`small ${profile.confidence === "low" ? "confidence-low" : "muted"}`}>
          {profile.confidence} confidence
        </span>
      </div>

      {!profile.recognized && (
        <div className="notice">This strain wasn't found in the usual databases, so the details below are a best guess.</div>
      )}

      <LeanMeter lean={profile.lean} classification={profile.classification} note={profile.lean_note} />

      {profile.summary && <p style={{ margin: 0 }}>{profile.summary}</p>}

      {facts.length > 0 && (
        <div className="facts">
          {facts.map(([k, v]) => (
            <div className="fact" key={k}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="profile-grid">
        <div className="stack-sm">
          <div className="section-title">Terpenes</div>
          {profile.terpenes.length === 0 ? (
            <div className="small muted">No terpene data found.</div>
          ) : (
            <div className="terps">
              {profile.terpenes.map((t) => (
                <div className="terp" key={t.name} style={{ ["--tc" as string]: terpColor(t.name) }}>
                  <span className="terp-dot" />
                  <span className="terp-name">{t.name}</span>
                  <ProminenceBar prominence={t.prominence} />
                  <span className="terp-desc">
                    {t.aroma}
                    {t.associated_effects && ` — ${t.associated_effects}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="stack-sm">
            <div className="section-title">Flavors</div>
            <div className="chips">
              {profile.flavors.map((f) => (
                <span className="chip" key={f}>{f}</span>
              ))}
            </div>
          </div>
          <div className="stack-sm">
            <div className="section-title">
              Expected effects{feltSet && <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}> · highlighted = you felt it</span>}
            </div>
            <div className="chips">
              {profile.effects.map((e) => (
                <span key={e} className={`chip${feltSet ? (feltSet.has(norm(e)) ? " match" : " miss") : ""}`}>{e}</span>
              ))}
            </div>
          </div>
          {profile.side_effects.length > 0 && (
            <div className="stack-sm">
              <div className="section-title">Possible downsides</div>
              <div className="chips">
                {profile.side_effects.map((e) => (
                  <span key={e} className={`chip${feltSet?.has(norm(e)) ? " match" : ""}`}>{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="brand-card stack-sm">
        <div className="row between">
          <div className="row">
            <div className="section-title">Brand</div>
            <strong>{profile.brand.name || "Unknown brand"}</strong>
            {profile.brand.home_market && <span className="small muted">{profile.brand.home_market}</span>}
          </div>
          {profile.brand.reputation_score > 0 ? (
            <span className="row small">
              <ScoreBar score={profile.brand.reputation_score} />
              <span className="mono">{profile.brand.reputation_score}/5</span>
            </span>
          ) : (
            <span className="small muted">Not enough info to rate</span>
          )}
        </div>
        {profile.brand.summary && <p style={{ margin: 0 }} className="small">{profile.brand.summary}</p>}
        {(profile.brand.strengths.length > 0 || profile.brand.concerns.length > 0) && (
          <div className="grid-2 small">
            {profile.brand.strengths.length > 0 && (
              <div>
                <div className="label">Known for</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {profile.brand.strengths.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {profile.brand.concerns.length > 0 && (
              <div>
                <div className="label">Watch out for</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {profile.brand.concerns.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {profile.product_notes && (
          <p style={{ margin: 0 }} className="small">
            <span className="label">This product · </span>
            {profile.product_notes}
          </p>
        )}
      </div>

      {profile.sources.length > 0 && (
        <details className="small">
          <summary className="muted" style={{ cursor: "pointer" }}>
            Sources ({profile.sources.length})
            {profile.looked_up_at && ` · looked up ${new Date(profile.looked_up_at).toLocaleDateString()}`}
          </summary>
          <div className="sources" style={{ marginTop: 6 }}>
            {profile.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                {s.title || s.url}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
