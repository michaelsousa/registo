CREATE TABLE public.user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pin" ON public.user_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all pins" ON public.user_pins FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert pins" ON public.user_pins FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update pins" ON public.user_pins FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete pins" ON public.user_pins FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to verify PIN (security definer so it bypasses RLS)
CREATE OR REPLACE FUNCTION public.verify_user_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_pins
    WHERE user_id = _user_id AND pin_hash = _pin
  );
$$;