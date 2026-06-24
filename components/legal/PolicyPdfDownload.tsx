import { Download } from "lucide-react";

type PolicyPdfDownloadProps = {
  url: string | null;
};

export function PolicyPdfDownload({ url }: PolicyPdfDownloadProps) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm transition hover:border-secondary/30 hover:bg-sky-50"
    >
      <Download className="h-4 w-4" aria-hidden />
      Download PDF version
    </a>
  );
}
