import type { AttachmentInfo } from "@/lib/attachments";

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Download links for staff attachments (administrators only; served by /api/admin/attachments/[id]). */
export function AttachmentLinks({ label, files }: { label: string; files: AttachmentInfo[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-[12.5px] font-medium text-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {files.map((f) => (
          <li key={f.id}>
            <a
              href={`/api/admin/attachments/${f.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[12.5px] hover:border-brand hover:text-brand"
            >
              <span aria-hidden>↓</span>
              <span dir="auto" className="max-w-56 truncate">
                {f.fileName}
              </span>
              <span className="text-muted">{size(f.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
