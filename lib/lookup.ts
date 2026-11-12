import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { StrainProfile } from "./types";

const MODEL = "claude-opus-5-5";

const client = new Anthropic();

const str = { type: "string" } as const;
const strList = { type: "array", items: { type: "string" } } as const;

/** The tool Claude calls with the finished profile. Strict mode guarantees the input matches. */
const RECORD_TOOL = {
  name: "record_profile",
  description:
    "Record the finished strain and brand profile for the product. Call this exactly once, after your research is done.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "strain_name", "aliases", "recognized", "classification", "lean", "lean_note", "lineage",
      "thc_range", "cbd_range", "summary", "terpenes", "flavors", "effects", "side_effects",
      "best_for", "brand", "product_notes", "confidence", "sources",
    ],
    properties: {
      strain_name: { type: "string", description: "Canonical strain name" },
      aliases: { ...strList, description: "Other names this strain is sold under" },
      recognized: { type: "boolean", description: "False if you could not find this strain anywhere" },
      classification: { type: "string", enum: ["indica", "sativa", "hybrid"] },
      lean: {
        type: "integer",
        description:
          "Where it sits on the indica-sativa spectrum, from -100 (pure indica) through 0 (balanced hybrid) to 100 (pure sativa). E.g. a 70/30 indica-dominant hybrid is about -40.",
      },
      lean_note: { type: "string", description: "One short sentence on the lean, e.g. a stated ratio like 70% indica / 30% sativa" },
      lineage: { type: "string", description: "Parent strains, e.g. 'Gelato x Wedding Cake', or empty if unknown" },
      thc_range: { type: "string", description: "Typical THC range, e.g. '20-26%', or empty" },
      cbd_range: { type: "string", description: "Typical CBD range, e.g. '<1%', or empty" },
      summary: { type: "string", description: "Two sentences on what this strain is known for" },
      terpenes: {
        type: "array",
        description: "Up to 5 terpenes, most prominent first",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "prominence", "aroma", "associated_effects"],
          properties: {
            name: { type: "string", description: "e.g. Myrcene, Limonene, Caryophyllene" },
            prominence: { type: "string", enum: ["dominant", "major", "minor"] },
            aroma: { type: "string", description: "A few words, e.g. 'earthy, musky, clove'" },
            associated_effects: { type: "string", description: "A few words, e.g. 'sedating, body relaxation'" },
          },
        },
      },
      flavors: { ...strList, description: "Up to 6 flavor notes" },
      effects: { ...strList, description: "Up to 6 commonly reported effects, single words or short phrases like 'Relaxed', 'Euphoric', 'Sleepy'" },
      side_effects: { ...strList, description: "Up to 4 commonly reported negatives, like 'Dry mouth'" },
      best_for: { type: "string", description: "When and for what it suits, e.g. 'Evenings; winding down, pain, sleep'" },
      brand: {
        type: "object",
        additionalProperties: false,
        required: ["name", "recognized", "reputation_score", "summary", "strengths", "concerns", "home_market"],
        properties: {
          name: str,
          recognized: { type: "boolean", description: "False if you found little or nothing on this brand" },
          reputation_score: {
            type: "integer",
            description: "Reputation from 1 (poor) to 5 (excellent) based on reviews, lab-testing transparency, recalls and consistency. 0 if there isn't enough information.",
          },
          summary: { type: "string", description: "Two sentences on the brand's reputation" },
          strengths: { ...strList, description: "Up to 3" },
          concerns: { ...strList, description: "Up to 3, e.g. recalls, failed tests, inconsistent batches. Empty if none found." },
          home_market: { type: "string", description: "Where the brand operates, e.g. 'California', or empty" },
        },
      },
      product_notes: {
        type: "string",
        description: "Anything specific to this brand's version of the strain or this product format (e.g. their cart uses live resin, published terpene %). Empty if nothing specific.",
      },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      sources: {
        type: "array",
        description: "Up to 5 pages you relied on",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "url"],
          properties: { title: str, url: str },
        },
      },
    },
  },
} satisfies Anthropic.Beta.BetaTool;

const SYSTEM = `You research cannabis products for a personal tasting journal.
Given a brand and product, use web search to find:
- The strain: indica/sativa/hybrid classification and how far it leans, lineage, typical THC/CBD, terpene profile, flavors, reported effects and side effects. Prefer strain databases (Leafly, AllBud, SeedFinder, Weedmaps strain pages) and lab results.
- The brand: its reputation with consumers and reviewers, lab-testing transparency, any recalls or failed tests, and consistency.
- Anything specific to this brand's version of the strain or this product format.

Keep it to a few searches. Sources often disagree; report the consensus and lower your confidence when they conflict.
If the product name is a brand's own blend rather than a known strain, say so in the summary and describe what the brand says about it.
If you can't find the strain or brand, say so plainly (recognized: false) rather than inventing details.
When you are done, call record_profile once with the result.`;

export class LookupError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));
}

export async function lookupProduct(args: {
  brand: string;
  product: string;
  form: string;
}): Promise<StrainProfile> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new LookupError("ANTHROPIC_API_KEY isn't set on the server. Add it to .env.local and restart.", 500);
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Brand: ${args.brand || "(unknown)"}\nProduct / strain: ${args.product}\nFormat: ${args.form}`,
    },
  ];

  // Web search can pause a long turn (stop_reason "pause_turn"); resend to let it continue.
  for (let round = 0; round < 4; round++) {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }, RECORD_TOOL],
        tool_choice: { type: "auto" },
        messages,
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new LookupError("The Anthropic API key was rejected.", 500);
      if (err instanceof Anthropic.RateLimitError) throw new LookupError("Rate limited by the Anthropic API. Try again in a minute.", 429);
      if (err instanceof Anthropic.APIError) throw new LookupError(`Lookup failed: ${err.message}`);
      throw err;
    }

    const call = response.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === RECORD_TOOL.name,
    );
    if (call) return normalize(call.input as StrainProfile);

    if (response.stop_reason === "refusal") {
      throw new LookupError("The lookup was declined. Try rephrasing the product name.", 422);
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    // Finished without calling the tool: nudge once.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: "Please call record_profile now with what you found." });
  }
  throw new LookupError("The lookup didn't return a profile. Try again.");
}

function normalize(p: StrainProfile): StrainProfile {
  return {
    ...p,
    lean: clamp(p.lean, -100, 100),
    terpenes: p.terpenes.slice(0, 5),
    flavors: p.flavors.slice(0, 6),
    effects: p.effects.slice(0, 6),
    side_effects: p.side_effects.slice(0, 4),
    brand: { ...p.brand, reputation_score: clamp(p.brand.reputation_score, 0, 5) },
    sources: p.sources.filter((s) => /^https?:\/\//.test(s.url)).slice(0, 5),
    looked_up_at: new Date().toISOString(),
  };
}
