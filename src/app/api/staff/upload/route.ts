import { NextResponse, type NextRequest } from "next/server";
import { ATTACHMENT_LIMITS, ATTACHMENT_TYPES } from "@/config/staff";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { isSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNLINKED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Checks the file's real content signature, not just its name. */
function signatureMatches(ext: string, b: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  if (ext === "pdf") return starts(0x25, 0x50, 0x44, 0x46); // %PDF
  if (ext === "png") return starts(0x89, 0x50, 0x4e, 0x47);
  if (ext === "jpg" || ext === "jpeg") return starts(0xff, 0xd8, 0xff);
  if (["docx", "xlsx", "pptx"].includes(ext)) return starts(0x50, 0x4b, 0x03, 0x04); // ZIP container
  if (["doc", "xls", "ppt"].includes(ext)) return starts(0xd0, 0xcf, 0x11, 0xe0); // OLE container
  return false;
}

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Uploads one attachment for an open staff form. It is linked to its item when the form is submitted. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers)) return err("forbidden", 403);
  if (!rateLimit(`staff-upload:${clientIp(req.headers)}`, 30, 10 * 60 * 1000).ok) return err("rate_limited", 429);
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > ATTACHMENT_LIMITS.maxBytes + 64 * 1024) return err("fileTooLarge", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("uploadFailed", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return err("uploadFailed", 400);
  if (file.size === 0) return err("uploadFailed", 400);
  if (file.size > ATTACHMENT_LIMITS.maxBytes) return err("fileTooLarge", 413);

  const name = sanitizeText(file.name).replace(/[\\/:*?"<>|]/g, "_").slice(0, 200) || "file";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = Object.entries(ATTACHMENT_TYPES).find(([, t]) => t.ext.includes(ext))?.[0];
  if (!mime) return err("fileType", 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(ext, bytes)) return err("fileType", 415);

  // Opportunistic cleanup of uploads that were never attached to a submitted form.
  await prisma.attachment.deleteMany({ where: { kind: null, createdAt: { lt: new Date(Date.now() - UNLINKED_TTL_MS) } } }).catch(() => {});

  const saved = await prisma.attachment.create({
    data: { fileName: name, mimeType: mime, size: bytes.length, data: Buffer.from(bytes) },
    select: { id: true, fileName: true, size: true },
  });
  return NextResponse.json({ id: saved.id, name: saved.fileName, size: saved.size }, { status: 201 });
}
