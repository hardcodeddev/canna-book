export type Classification = "indica" | "sativa" | "hybrid";
export type Prominence = "dominant" | "major" | "minor";
export type Confidence = "high" | "medium" | "low";
export type Recommend = "yes" | "depends" | "no";

export const FORMS = [
  "Flower",
  "Pre-roll",
  "Vape cart",
  "Disposable vape",
  "Concentrate",
  "Edible",
  "Tincture",
  "Other",
] as const;
export type Form = (typeof FORMS)[number];

export interface Terpene {
  name: string;
  prominence: Prominence;
  aroma: string;
  associated_effects: string;
}

export interface BrandInfo {
  name: string;
  recognized: boolean;
  /** 1-5, or 0 when there isn't enough to go on */
  reputation_score: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  home_market: string;
}

export interface Source {
  title: string;
  url: string;
}

/** What the lookup returns for a product. */
export interface StrainProfile {
  strain_name: string;
  aliases: string[];
  recognized: boolean;
  classification: Classification;
  /** -100 = pure indica, 0 = balanced, +100 = pure sativa */
  lean: number;
  lean_note: string;
  lineage: string;
  thc_range: string;
  cbd_range: string;
  summary: string;
  terpenes: Terpene[];
  flavors: string[];
  effects: string[];
  side_effects: string[];
  best_for: string;
  brand: BrandInfo;
  product_notes: string;
  confidence: Confidence;
  sources: Source[];
  /** Set by the server */
  looked_up_at?: string;
}

export interface Feel {
  tags: string[];
  /** 1-5 */
  intensity: number;
  notes: string;
}

export interface Entry {
  id: string;
  created_at: string;
  updated_at: string;
  /** YYYY-MM-DD */
  date: string;
  brand: string;
  product: string;
  form: Form;
  thc: number | null;
  profile: StrainProfile | null;
  feel: Feel;
  /** 0 = not rated, else 1-5 */
  rating: number;
  recommend: Recommend | null;
  recommend_to: string;
  review: string;
}

export type EntryInput = Omit<Entry, "id" | "created_at" | "updated_at">;

export const FEEL_TAGS = [
  "Relaxed",
  "Euphoric",
  "Happy",
  "Uplifted",
  "Creative",
  "Focused",
  "Energetic",
  "Giggly",
  "Talkative",
  "Body high",
  "Sleepy",
  "Hungry",
  "Couch-locked",
  "Pain relief",
  "Calm",
  "Anxious",
  "Paranoid",
  "Dry mouth",
  "Dry eyes",
  "Headache",
  "Foggy",
];
