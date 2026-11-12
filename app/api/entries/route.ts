import { NextResponse } from "next/server";
import { createEntry, listEntries } from "@/lib/db";
import { parseEntry } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listEntries());
}

export async function POST(req: Request) {
  const input = parseEntry(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(createEntry(input), { status: 201 });
}
