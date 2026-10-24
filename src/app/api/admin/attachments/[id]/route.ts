import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Downloads a staff attachment. Administrators only; always served as a download, never rendered. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const a = await prisma.attachment.findFirst({ where: { id, kind: { not: null } } });
  if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await audit(admin.id, "attachment_download", `${a.id} ${a.fileName}`);
  const ascii = a.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return new NextResponse(new Uint8Array(a.data), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(a.size),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
      "Content-Security-Policy": "sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
