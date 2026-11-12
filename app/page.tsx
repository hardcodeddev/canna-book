"use client";

import { useEffect, useMemo, useState } from "react";
import type { Classification, Entry } from "@/lib/types";
import { EntryEditor } from "@/components/EntryEditor";
import { EntryDetail } from "@/components/EntryDetail";
import { LeanMeter, Stars, formatDate, terpColor } from "@/components/bits";

type Mode = { kind: "welcome" } | { kind: "view"; id: string } | { kind: "new" } | { kind: "edit"; id: string };
type Filter = "all" | Classification;

const STRIPE: Record<Classification, string> = { indica: "var(--indica)", sativa: "var(--sativa)", hybrid: "var(--hybrid)" };

export default function Home() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "welcome" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/entries")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Entry[]) => setEntries(data))
      .catch(() => setLoadError("Couldn't load your journal. Is the server running?"));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (filter !== "all" && e.profile?.classification !== filter) return false;
      if (!q) return true;
      return [e.product, e.brand, e.profile?.strain_name, ...(e.profile?.terpenes.map((t) => t.name) ?? []), ...e.feel.tags]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    });
  }, [entries, query, filter]);

  const avg = useMemo(() => {
    const rated = (entries ?? []).filter((e) => e.rating > 0);
    return rated.length ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : null;
  }, [entries]);

  const current = mode.kind === "view" || mode.kind === "edit" ? entries?.find((e) => e.id === mode.id) : undefined;

  const upsert = (saved: Entry) => {
    setEntries((prev) => {
      const rest = (prev ?? []).filter((e) => e.id !== saved.id);
      return [saved, ...rest].sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)));
    });
    setMode({ kind: "view", id: saved.id });
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wordmark">
          <span className="wordmark-dot" aria-hidden />
          Canna Book
        </div>
        <span className="spacer" />
        {entries && entries.length > 0 && (
          <span className="topbar-stat">
            {entries.length} session{entries.length === 1 ? "" : "s"}
            {avg && ` · avg ${avg}★`}
          </span>
        )}
        <button className="btn btn-primary" onClick={() => setMode({ kind: "new" })}>+ New session</button>
      </header>

      <div className="panes" data-view={mode.kind === "welcome" ? "list" : "main"}>
        <aside className="pane-list">
          <div className="list-tools">
            <input
              id="search" className="input" type="search" placeholder="Search strain, brand, terpene, effect…"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
            <div className="filters" role="group" aria-label="Filter by type">
              {(["all", "indica", "hybrid", "sativa"] as Filter[]).map((f) => (
                <button key={f} className="filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loadError && <div className="notice error">{loadError}</div>}
          {!entries && !loadError && <div className="loading-bar" />}
          {entries && entries.length === 0 && (
            <div className="empty-list">No sessions yet. Press “New session” to log your first one.</div>
          )}
          {entries && entries.length > 0 && shown.length === 0 && <div className="empty-list">Nothing matches that search.</div>}

          <ul className="entry-list">
            {shown.map((e) => (
              <li key={e.id}>
                <button
                  className="entry-card"
                  aria-current={current?.id === e.id}
                  onClick={() => setMode({ kind: "view", id: e.id })}
                >
                  <span className="stripe" style={{ background: e.profile ? STRIPE[e.profile.classification] : "var(--line)" }} />
                  <span className="title">{e.product}</span>
                  <span className="right">
                    {e.rating > 0 ? <Stars value={e.rating} size="sm" /> : <span className="small muted">unrated</span>}
                    <span className="small muted mono">{formatDate(e.date)}</span>
                  </span>
                  <span className="meta">{[e.brand, e.form].filter(Boolean).join(" · ")}</span>
                  {e.profile && (
                    <span className="terp-dots">
                      <span style={{ width: 90, display: "inline-block" }}>
                        <LeanMeter lean={e.profile.lean} classification={e.profile.classification} compact />
                      </span>
                      {e.profile.terpenes.slice(0, 3).map((t) => (
                        <span key={t.name} className="row" style={{ gap: 4, ["--tc" as string]: terpColor(t.name) }}>
                          <span className="mini-dot" />
                          {t.name}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="pane-main">
          {mode.kind !== "welcome" && (
            <button className="btn btn-sm btn-ghost back-btn" style={{ marginBottom: 8 }} onClick={() => setMode({ kind: "welcome" })}>
              ← All sessions
            </button>
          )}

          {mode.kind === "welcome" && (
            <section className="panel welcome">
              <h2>Log what you&apos;re smoking</h2>
              <ol>
                <li>Enter the brand and product, then press <strong>Look up strain &amp; brand</strong>.</li>
                <li>You get the strain&apos;s indica/sativa lean, terpenes, flavors, expected effects and the brand&apos;s reputation.</li>
                <li>Tap what you actually felt, rate it, and say who you&apos;d recommend it to.</li>
              </ol>
              <div>
                <button className="btn btn-primary" onClick={() => setMode({ kind: "new" })}>Start a session</button>
              </div>
            </section>
          )}

          {mode.kind === "new" && (
            <EntryEditor key="new" onSaved={upsert} onCancel={() => setMode({ kind: "welcome" })} />
          )}

          {mode.kind === "edit" && current && (
            <EntryEditor key={current.id} initial={current} onSaved={upsert} onCancel={() => setMode({ kind: "view", id: current.id })} />
          )}

          {mode.kind === "view" && current && (
            <EntryDetail
              entry={current}
              onEdit={() => setMode({ kind: "edit", id: current.id })}
              onDeleted={() => {
                setEntries((prev) => (prev ?? []).filter((e) => e.id !== current.id));
                setMode({ kind: "welcome" });
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
