"use client";

import { useId, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ErrorText } from "@/components/survey/fields";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_ACCEPT, ATTACHMENT_LIMITS } from "@/config/staff";
import type { StaffDictionary } from "@/i18n/staff";
import type { AttachmentRef } from "@/lib/staff-schema";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Optional files for an item (uploaded immediately; linked to the item when the form is submitted). */
export function AttachmentField({ name, t, label }: { name: string; t: StaffDictionary; label?: string }) {
  const { control } = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const a = t.attachments;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const files: AttachmentRef[] = Array.isArray(field.value) ? field.value : [];

        const upload = async (list: FileList | null) => {
          if (!list?.length) return;
          setError(null);
          const room = ATTACHMENT_LIMITS.perItem - files.length;
          if (list.length > room) setError(t.errors.tooManyFiles);
          const added: AttachmentRef[] = [];
          setBusy(true);
          for (const file of Array.from(list).slice(0, Math.max(0, room))) {
            if (file.size > ATTACHMENT_LIMITS.maxBytes) {
              setError(t.errors.fileTooLarge);
              continue;
            }
            const body = new FormData();
            body.append("file", file);
            try {
              const res = await fetch("/api/staff/upload", { method: "POST", body });
              const data = (await res.json().catch(() => ({}))) as Partial<AttachmentRef> & { error?: keyof StaffDictionary["errors"] };
              if (res.ok && data.id) added.push({ id: data.id, name: data.name ?? file.name, size: data.size ?? file.size });
              else setError(t.errors[data.error ?? "uploadFailed"] ?? t.errors.uploadFailed);
            } catch {
              setError(t.errors.uploadFailed);
            }
          }
          setBusy(false);
          if (added.length) field.onChange([...files, ...added]);
          if (inputRef.current) inputRef.current.value = "";
        };

        return (
          <div>
            <p className="text-[14px] font-medium leading-snug">
              {label ?? a.label} <span className="ms-1 text-[13px] font-normal text-muted">({t.common.optional})</span>
            </p>
            <p id={`${id}-h`} className="mt-1 text-[12.5px] text-muted">
              {a.hint}
            </p>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2 text-[13px]">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <path d="M6 2.5h5.5L15.5 6.5V17a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
                      <path d="M11.5 2.5v4h4" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate" dir="auto">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-muted">{kb(f.size)}</span>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded px-1.5 text-brand hover:bg-brand-soft"
                      onClick={() => field.onChange(files.filter((x) => x.id !== f.id))}
                      aria-label={`${a.remove}: ${f.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {files.length < ATTACHMENT_LIMITS.perItem && (
              <>
                <input
                  ref={inputRef}
                  id={`${id}-f`}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="sr-only"
                  aria-describedby={`${id}-h`}
                  onChange={(e) => upload(e.target.files)}
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy} onClick={() => inputRef.current?.click()}>
                  {busy ? a.uploading : `+ ${a.add}`}
                </Button>
              </>
            )}
            <ErrorText id={`${id}-e`} message={error ?? undefined} />
          </div>
        );
      }}
    />
  );
}
