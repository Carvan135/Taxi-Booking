import { getSupabasePublicEnv } from "@/lib/env/supabase-public";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  POLICY_STORAGE_BUCKET,
  type PolicyType,
} from "@/lib/policies/types";

export type PolicyDocumentRow = {
  id: string;
  policy_type: PolicyType;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
  version: number;
};

function buildPublicStorageUrl(filePath: string): string | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const encoded = filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${env.url}/storage/v1/object/public/${POLICY_STORAGE_BUCKET}/${encoded}`;
}

export async function getPolicyDocument(
  policyType: PolicyType,
): Promise<PolicyDocumentRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .eq("policy_type", policyType)
    .maybeSingle();

  if (error) {
    console.error("getPolicyDocument error:", error);
    return null;
  }

  return (data as PolicyDocumentRow | null) ?? null;
}

export async function getPolicyDocumentUrl(
  policyType: PolicyType,
): Promise<string | null> {
  const row = await getPolicyDocument(policyType);
  if (!row?.file_path) return null;
  return buildPublicStorageUrl(row.file_path);
}

export function getPolicyDocumentPublicUrl(filePath: string): string | null {
  return buildPublicStorageUrl(filePath);
}
