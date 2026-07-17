import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const dataDir = join(process.cwd(), "data", "attachments");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const metaPath = join(dataDir, `${id}.meta.json`);
    const filePath = join(dataDir, id);

    const metaRaw = await readFile(metaPath, "utf8").catch(() => "{}");
    const meta = JSON.parse(metaRaw) as { contentType?: string; filename?: string };
    const body = await readFile(filePath);

    return new Response(body, {
      headers: {
        "Content-Type": meta.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${meta.filename || id}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }
}
