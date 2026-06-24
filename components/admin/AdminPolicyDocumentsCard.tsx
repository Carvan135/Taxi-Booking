"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePolicyDocuments } from "@/hooks/queries/usePolicyDocuments";
import {
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  type PolicyType,
} from "@/lib/policies/types";
import type { PolicyDocument } from "@/types";

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function documentForType(
  rows: PolicyDocument[],
  policyType: PolicyType,
): PolicyDocument | undefined {
  return rows.find((row) => row.policy_type === policyType);
}

type AdminPolicyDocumentsCardProps = {
  onToast: (message: string) => void;
};

export function AdminPolicyDocumentsCard({
  onToast,
}: AdminPolicyDocumentsCardProps) {
  const { data: rows = [], isLoading, refetch } = usePolicyDocuments();
  const [uploadingType, setUploadingType] = useState<PolicyType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Partial<Record<PolicyType, HTMLInputElement | null>>>(
    {},
  );

  async function handleFileSelected(
    policyType: PolicyType,
    file: File | undefined,
  ) {
    if (!file) return;

    setError(null);
    setUploadingType(policyType);

    try {
      const formData = new FormData();
      formData.append("policy_type", policyType);
      formData.append("file", file);

      const res = await fetch("/api/admin/policy-documents/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(body.error ?? "Upload failed");
      }

      await refetch();
      onToast(
        `${POLICY_TYPE_LABELS[policyType]} updated — now live for all users`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingType(null);
      const input = fileInputs.current[policyType];
      if (input) input.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-secondary" aria-hidden />
        <h2 className="text-lg font-semibold text-[#111827]">Policy documents</h2>
      </div>
      <p className="mt-1 text-sm text-[#6B7280]">
        Upload PDF versions of legal pages. New uploads replace the current file
        immediately.
      </p>

      {isLoading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading policy documents…
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100">
          {POLICY_TYPES.map((policyType) => {
            const doc = documentForType(rows, policyType);
            const isUploading = uploadingType === policyType;

            return (
              <li
                key={policyType}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827]">
                    {POLICY_TYPE_LABELS[policyType]}
                  </p>
                  {doc ? (
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {doc.file_name} · uploaded {formatUploadedAt(doc.uploaded_at)}
                      {doc.version > 1 ? ` · v${doc.version}` : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      No file uploaded yet
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <input
                    ref={(el) => {
                      fileInputs.current[policyType] = el;
                    }}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    id={`policy-upload-${policyType}`}
                    onChange={(e) =>
                      void handleFileSelected(
                        policyType,
                        e.target.files?.[0],
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={isUploading}
                    onClick={() =>
                      fileInputs.current[policyType]?.click()
                    }
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload new version
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
