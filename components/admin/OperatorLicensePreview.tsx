"use client";

import { FileText } from "lucide-react";

function fileExt(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function isImageExt(ext: string): boolean {
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic"].includes(ext);
}

function isPdfExt(ext: string): boolean {
  return ext === "pdf";
}

type OperatorLicensePreviewProps = {
  storagePath: string | null;
  signedUrl: string | null;
};

export function OperatorLicensePreview({
  storagePath,
  signedUrl,
}: OperatorLicensePreviewProps) {
  if (!storagePath?.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-[#6B7280]">
        No driving licence has been uploaded for this operator yet.
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <p className="font-medium text-[#374151]">
          This licence could not be opened for viewing.
        </p>
        <p className="mt-1.5 leading-relaxed text-[#6B7280]">
          The file may no longer be available, or there may be a temporary
          issue. Please try refreshing the page. If it still does not appear,
          contact support.
        </p>
      </div>
    );
  }

  const ext = fileExt(storagePath);
  const image = isImageExt(ext);
  const pdf = isPdfExt(ext);
  const fileName = storagePath.split("/").pop() ?? "Document";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-0 items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-medium text-[#111827]">
        <FileText className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
        <span className="shrink-0">Driving licence</span>
        <span className="truncate font-normal text-[#6B7280]">({fileName})</span>
      </div>
      <div className="p-4">
        {pdf ? (
          <iframe
            title="Driving licence document"
            src={signedUrl}
            className="h-[min(70vh,560px)] w-full rounded-lg border border-slate-200 bg-white"
          />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signedUrl}
            alt="Driving licence document"
            className="max-h-[min(80vh,720px)] w-full rounded-lg border border-slate-200 object-contain object-left"
          />
        ) : (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-semibold text-secondary underline"
          >
            Open licence file in a new tab
          </a>
        )}
      </div>
    </div>
  );
}
