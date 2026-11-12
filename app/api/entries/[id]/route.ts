import { NextResponse } from "next/server";
import { deleteEntry, getEntry, updateEntry } from "@/lib/db";
import { parseEntry } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const entry = getEntry((await params).id);
  return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  const input = parseEntry(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const entry = updateEntry((await params).id, input);
  return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return deleteEntry((await params).id)
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
