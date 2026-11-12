import { NextResponse } from "next/server";
import { cacheLookup, getCachedLookup, lookupKey } from "@/lib/db";
import { LookupError, lookupProduct } from "@/lib/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { brand?: string; product?: string; form?: string; refresh?: boolean }
    | null;
  const brand = (body?.brand ?? "").trim().slice(0, 200);
  const product = (body?.product ?? "").trim().slice(0, 200);
  const form = (body?.form ?? "Flower").trim().slice(0, 40);
  if (!product) return NextResponse.json({ error: "Enter a product or strain name first." }, { status: 400 });

  const key = lookupKey(brand, product, form);
  if (!body?.refresh) {
    const cached = getCachedLookup(key);
    if (cached) return NextResponse.json({ profile: cached, cached: true });
  }

  try {
    const profile = await lookupProduct({ brand, product, form });
    cacheLookup(key, profile);
    return NextResponse.json({ profile, cached: false });
  } catch (err) {
    if (err instanceof LookupError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Lookup failed unexpectedly." }, { status: 500 });
  }
}
