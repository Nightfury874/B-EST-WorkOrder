import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

type StoredObject = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

type RuntimeEnv = {
  ATTACHMENTS?: {
    get(key: string): Promise<StoredObject | null>;
  };
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bucket = (env as unknown as RuntimeEnv).ATTACHMENTS;
  if (!bucket) return NextResponse.json({ error: "Attachment storage is unavailable." }, { status: 503 });

  const object = await bucket.get(`attachments/${id}`);
  if (!object) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${object.customMetadata?.filename || id}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
