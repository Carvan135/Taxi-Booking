-- Admins need read access to operator license objects for signed URLs in admin UI.
CREATE POLICY "operator_licenses_select_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'operator-licenses'
    AND public.is_admin()
  );
