-- Allow operators to create their own row during onboarding
CREATE POLICY "operators_insert_own"
  ON public.operators
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for driver license uploads (private; URLs resolved server-side or via signed URLs later)
INSERT INTO storage.buckets (id, name, public)
VALUES ('operator-licenses', 'operator-licenses', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "operator_licenses_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'operator-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "operator_licenses_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'operator-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "operator_licenses_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'operator-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "operator_licenses_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'operator-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
