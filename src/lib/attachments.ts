import "server-only";
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "./db";

export type AttachmentInfo = { id: string; fileName: string; size: number };

/** Attachment metadata (no file contents) grouped by the item they belong to. */
export async function attachmentsFor(kind: AttachmentKind, parentIds: string[]): Promise<Map<string, AttachmentInfo[]>> {
  const map = new Map<string, AttachmentInfo[]>();
  if (!parentIds.length) return map;
  const rows = await prisma.attachment.findMany({
    where: { kind, parentId: { in: parentIds } },
    select: { id: true, fileName: true, size: true, parentId: true },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) {
    const list = map.get(r.parentId!) ?? [];
    list.push({ id: r.id, fileName: r.fileName, size: r.size });
    map.set(r.parentId!, list);
  }
  return map;
}
