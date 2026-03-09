CREATE POLICY "Admins can insert settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));