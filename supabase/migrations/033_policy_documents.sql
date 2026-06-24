-- Admin-managed policy PDF documents (one current file per policy type).

DO $$ BEGIN
  CREATE TYPE public.policy_type_enum AS ENUM (
    'privacy_policy',
    'terms_conditions',
    'faq',
    'cookie_policy'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type public.policy_type_enum NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  version INT DEFAULT 1
);

ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_documents_public_select" ON public.policy_documents;
CREATE POLICY "policy_documents_public_select"
  ON public.policy_documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "policy_documents_admin_all" ON public.policy_documents;
CREATE POLICY "policy_documents_admin_all"
  ON public.policy_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::public.user_role_enum
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::public.user_role_enum
    )
  );
