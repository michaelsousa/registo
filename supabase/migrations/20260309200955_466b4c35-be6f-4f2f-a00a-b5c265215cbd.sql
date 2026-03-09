
CREATE TABLE public.store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Loja Principal',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active locations" ON public.store_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert locations" ON public.store_locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update locations" ON public.store_locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete locations" ON public.store_locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
