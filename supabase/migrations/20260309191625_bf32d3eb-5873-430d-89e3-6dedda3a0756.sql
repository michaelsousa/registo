
-- Add schedule_type and tolerance to user_settings
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS tolerance_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tolerance_mode text NOT NULL DEFAULT 'grace';

-- Per-day schedule table
CREATE TABLE public.user_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_index integer NOT NULL,
  is_workday boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_index)
);

ALTER TABLE public.user_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON public.user_schedules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all schedules" ON public.user_schedules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert schedules" ON public.user_schedules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update schedules" ON public.user_schedules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete schedules" ON public.user_schedules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
