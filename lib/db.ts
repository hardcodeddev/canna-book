import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Entry, EntryInput, StrainProfile } from "./types";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "canna-book.db");

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __cannaDb?: DatabaseSync };

function db(): DatabaseSync {
  if (!globalForDb.__cannaDb) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new DatabaseSync(DB_PATH);
    conn.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        date TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS entries_date ON entries(date DESC, created_at DESC);
      CREATE TABLE IF NOT EXISTS lookups (
        key TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        profile TEXT NOT NULL
      );
    `);
    globalForDb.__cannaDb = conn;
  }
  return globalForDb.__cannaDb;
}

type Row = { id: string; created_at: string; updated_at: string; data: string };

function rowToEntry(row: Row): Entry {
  const data = JSON.parse(row.data) as EntryInput;
  return { ...data, id: row.id, created_at: row.created_at, updated_at: row.updated_at };
}

export function listEntries(): Entry[] {
  const rows = db()
    .prepare("SELECT id, created_at, updated_at, data FROM entries ORDER BY date DESC, created_at DESC")
    .all() as unknown as Row[];
  return rows.map(rowToEntry);
}

export function getEntry(id: string): Entry | null {
  const row = db()
    .prepare("SELECT id, created_at, updated_at, data FROM entries WHERE id = ?")
    .get(id) as unknown as Row | undefined;
  return row ? rowToEntry(row) : null;
}

export function createEntry(input: EntryInput): Entry {
  const now = new Date().toISOString();
  const id = randomUUID();
  db()
    .prepare("INSERT INTO entries (id, created_at, updated_at, date, data) VALUES (?, ?, ?, ?, ?)")
    .run(id, now, now, input.date, JSON.stringify(input));
  return { ...input, id, created_at: now, updated_at: now };
}

export function updateEntry(id: string, input: EntryInput): Entry | null {
  const now = new Date().toISOString();
  const res = db()
    .prepare("UPDATE entries SET updated_at = ?, date = ?, data = ? WHERE id = ?")
    .run(now, input.date, JSON.stringify(input), id);
  return res.changes ? getEntry(id) : null;
}

export function deleteEntry(id: string): boolean {
  return db().prepare("DELETE FROM entries WHERE id = ?").run(id).changes > 0;
}

export function lookupKey(brand: string, product: string, form: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return [norm(brand), norm(product), norm(form)].join("|");
}

export function getCachedLookup(key: string): StrainProfile | null {
  const row = db().prepare("SELECT profile FROM lookups WHERE key = ?").get(key) as
    | { profile: string }
    | undefined;
  return row ? (JSON.parse(row.profile) as StrainProfile) : null;
}

export function cacheLookup(key: string, profile: StrainProfile): void {
  db()
    .prepare(
      "INSERT INTO lookups (key, created_at, profile) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET created_at = excluded.created_at, profile = excluded.profile",
    )
    .run(key, new Date().toISOString(), JSON.stringify(profile));
}
