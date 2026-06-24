import { NextResponse } from "next/server";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { getPolicyDocumentPublicUrl } from "@/lib/policies/getPolicyDocument";
import {
  POLICY_STORAGE_BUCKET,
  POLICY_TYPES,
  type PolicyType,
} from "@/lib/policies/types";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function isPolicyType(value: string): value is PolicyType {
  return (POLICY_TYPES as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const user = await getUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile(supabase, user.id);
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const policyTypeRaw = formData.get("policy_type");
    const file = formData.get("file");

    if (typeof policyTypeRaw !== "string" || !isPolicyType(policyTypeRaw)) {
      return NextResponse.json({ error: "Invalid policy type" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File must be smaller than 10MB" },
        { status: 400 },
      );
    }

    const filePath = `${policyTypeRaw}-${Date.now()}.pdf`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const admin = createServiceRoleClient();

    const { error: uploadError } = await admin.storage
      .from(POLICY_STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("policy document upload failed:", uploadError);
      return NextResponse.json(
        { error: "Could not upload file" },
        { status: 500 },
      );
    }

    const { data: existing, error: existingError } = await admin
      .from("policy_documents")
      .select("id, file_path, version")
      .eq("policy_type", policyTypeRaw)
      .maybeSingle();

    if (existingError) {
      console.error("policy_documents lookup failed:", existingError);
      return NextResponse.json(
        { error: "Could not save policy document" },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    if (existing) {
      const { error: updateError } = await admin
        .from("policy_documents")
        .update({
          file_path: filePath,
          file_name: file.name,
          uploaded_by: user.id,
          uploaded_at: now,
          version: Number(existing.version ?? 1) + 1,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("policy_documents update failed:", updateError);
        return NextResponse.json(
          { error: "Could not save policy document" },
          { status: 500 },
        );
      }

      if (existing.file_path && existing.file_path !== filePath) {
        const { error: removeError } = await admin.storage
          .from(POLICY_STORAGE_BUCKET)
          .remove([existing.file_path]);
        if (removeError) {
          console.error("old policy file cleanup failed:", removeError);
        }
      }
    } else {
      const { error: insertError } = await admin.from("policy_documents").insert({
        policy_type: policyTypeRaw,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id,
        uploaded_at: now,
        version: 1,
      });

      if (insertError) {
        console.error("policy_documents insert failed:", insertError);
        return NextResponse.json(
          { error: "Could not save policy document" },
          { status: 500 },
        );
      }
    }

    const publicUrl = getPolicyDocumentPublicUrl(filePath);
    return NextResponse.json({
      success: true,
      file_path: filePath,
      public_url: publicUrl,
    });
  } catch (err) {
    console.error("policy-documents/upload error:", err);
    return NextResponse.json(
      { error: "Could not upload policy document" },
      { status: 500 },
    );
  }
}
