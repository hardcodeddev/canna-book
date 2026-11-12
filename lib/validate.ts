import { FORMS, type EntryInput, type Form, type Recommend } from "./types";

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};

/** Coerce an untrusted request body into an EntryInput, or return an error message. */
export function parseEntry(body: unknown): EntryInput | string {
  if (!body || typeof body !== "object") return "Expected a JSON object.";
  const b = body as Record<string, unknown>;
  const product = s(b.product, 200).trim();
  if (!product) return "Product name is required.";
  const date = s(b.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Date must be YYYY-MM-DD.";
  const form = (FORMS as readonly string[]).includes(s(b.form)) ? (b.form as Form) : "Other";
  const thcNum = b.thc === null || b.thc === "" || b.thc === undefined ? null : Number(b.thc);
  const feel = (b.feel ?? {}) as Record<string, unknown>;
  const recommend = ["yes", "depends", "no"].includes(s(b.recommend)) ? (b.recommend as Recommend) : null;

  return {
    date,
    brand: s(b.brand, 200).trim(),
    product,
    form,
    thc: thcNum !== null && Number.isFinite(thcNum) ? Math.max(0, Math.min(100, thcNum)) : null,
    profile: b.profile && typeof b.profile === "object" ? (b.profile as EntryInput["profile"]) : null,
    feel: {
      tags: Array.isArray(feel.tags) ? feel.tags.map((t) => s(t, 40)).filter(Boolean).slice(0, 30) : [],
      intensity: int(feel.intensity, 1, 5),
      notes: s(feel.notes, 5000),
    },
    rating: int(b.rating, 0, 5),
    recommend,
    recommend_to: s(b.recommend_to, 300),
    review: s(b.review, 5000),
  };
}
